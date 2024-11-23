from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from io import BytesIO
from PIL import Image
import base64
import psycopg2
import subprocess
import json
import geojson
import os
import shutil
import tempfile
import shapefile
from rasterio.io import MemoryFile
import zipfile
from rasterio.warp import calculate_default_transform, reproject, Resampling
from pyproj import CRS, Transformer
import rasterio
from shapely.ops import transform
import numpy as np

import matplotlib.colors as mcolors
from rasterio.enums import Resampling

import matplotlib.pyplot as plt
from PIL import Image
import geopandas as gpd


import re
# import traceback

import geojson
from geojson import Feature, FeatureCollection


app = FastAPI()

origins = "*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB

def normalize_table_name(table_name: str) -> str:
    return table_name.lower().replace('-', '_').replace(' ', '_')

def get_geojson_from_table(table_name):
    try:
        # Establish connection to PostgreSQL database
        conn = psycopg2.connect(
        host="10.238.0.3",
        port="5432",
        dbname="nyoba",
        user="postgres",
        password="15032003"
    )
        cursor = conn.cursor()

        # Query to fetch GeoJSON data
        query = f'SELECT id, ST_AsGeoJSON(geom) as geom, * FROM "{table_name}"'
        cursor.execute(query)
        rows = cursor.fetchall()

        # Parse rows into GeoJSON features
        features = []
        for row in rows:
            geometry = geojson.loads(row[1])
            properties = {desc[0]: row[idx + 2] for idx, desc in enumerate(cursor.description[2:])}
            feature = Feature(geometry=geometry, properties=properties)
            features.append(feature)

        # Close cursor and connection
        cursor.close()
        conn.close()

        # Create a GeoJSON FeatureCollection
        feature_collection = FeatureCollection(features)
        return feature_collection

    except psycopg2.Error as e:
        print("Error fetching GeoJSON from database:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
def process_geojson(file_path: str, table_name: str):
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host="10.238.0.3",
            port="5432",
            dbname="nyoba",
            user="postgres",
            password="15032003"
        )
        cursor = conn.cursor()
        
        cursor.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        conn.commit()

        # Load GeoJSON file
        with open(file_path, 'r') as geojson_file:
            geojson_data = geojson.load(geojson_file)

        # Create table with necessary columns
        create_table_query = f'''
        CREATE TABLE IF NOT EXISTS "{table_name}" (
            id SERIAL PRIMARY KEY,
            geom GEOMETRY,
            properties JSONB
        );
        '''
        cursor.execute(create_table_query)

        # Get the existing columns
        cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table_name}';")
        existing_columns = {row[0] for row in cursor.fetchall()}

        # Insert GeoJSON features into the table
        for feature in geojson_data['features']:
            geom = feature['geometry']
            properties = feature['properties']

            # Check and add missing columns
            for key in properties.keys():
                if key not in existing_columns:
                    alter_table_query = f'ALTER TABLE "{table_name}" ADD COLUMN "{key}" TEXT;'
                    cursor.execute(alter_table_query)
                    existing_columns.add(key)

            if properties:
                # Prepare columns and placeholders for dynamic insertion
                columns = ", ".join([f'"{key}"' for key in properties.keys()])
                values_placeholders = ", ".join(["%s"] * len(properties))

                # Build the SQL query
                insert_query = f'''
                INSERT INTO "{table_name}" (geom, {columns}, properties)
                VALUES (ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), {values_placeholders}, %s::jsonb);
                '''
                values = [json.dumps(geom)] + list(properties.values()) + [json.dumps(properties)]
            else:
                # Handle case with no properties
                insert_query = f'''
                INSERT INTO "{table_name}" (geom, properties)
                VALUES (ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), %s::jsonb);
                '''
                values = [json.dumps(geom), json.dumps(properties)]

            # Log to check the query before execution
            print("Insert Query:", insert_query)

            # Execute the query
            cursor.execute(insert_query, values)

        # Commit transaction
        conn.commit()

        # Close cursor and connection
        cursor.close()
        conn.close()

        return {"status": "success", "message": f"GeoJSON data has been inserted into {table_name}."}

    except (Exception, psycopg2.Error) as error:
        # Rollback in case of error
        if conn:
            conn.rollback()
            cursor.close()
            conn.close()
        print("Error while processing GeoJSON", error)
        raise HTTPException(status_code=500, detail="Internal Server Error")


def preprocess_shapefile(input_shapefile_path, output_shapefile_path, target_srid):
    # Define the target CRS using pyproj
    target_crs = CRS(f"EPSG:{target_srid}")

    # Read the shapefile using geopandas
    gdf = gpd.read_file(input_shapefile_path)

    # Check if the shapefile has a CRS
    if gdf.crs is None:
        raise ValueError("Input shapefile does not have a CRS.")

    # Define the source CRS from the shapefile
    src_crs = CRS(gdf.crs.to_epsg())
    
    if src_crs == target_crs:
        print("Source CRS is already the target CRS. No reprojection needed.")
        gdf.to_file(output_shapefile_path)
        return

    # Create a transformer object
    transformer = Transformer.from_crs(src_crs, target_crs, always_xy=True)

    # Reproject geometries
    def reproject_geometry(geometry):
        if geometry.is_empty:
            return geometry
        return transform(lambda x, y: transformer.transform(x, y), geometry)

    gdf['geometry'] = gdf['geometry'].apply(reproject_geometry)
    gdf.crs = target_crs.to_string()  # Set the target CRS as the new CRS for the GeoDataFrame

    # Save the reprojected GeoDataFrame to a new shapefile
    gdf.to_file(output_shapefile_path)

    print(f"Shapefile reprojected to EPSG:{target_srid} and saved to {output_shapefile_path}")


def process_shapefile(file_path, table_name, srid=4326):
    conn = psycopg2.connect(
        host="10.238.0.3",
        port="5432",
        dbname="nyoba",
        user="postgres",
        password="15032003"
    )
    cursor = conn.cursor()

    try:
        # Drop the table if it exists
        cursor.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        conn.commit()

        # Read the shapefile
        with shapefile.Reader(file_path) as shp:
            fields = shp.fields[1:]  # Skip deletion field
            field_names = [field[0].lower() for field in fields]

            if 'id' in field_names:
                field_names.remove('id')

            # Create table with dynamic fields
            if field_names:
                field_definitions = ", ".join([f'"{field_name}" VARCHAR' for field_name in field_names])
                create_table_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" (id SERIAL PRIMARY KEY, {field_definitions}, geom GEOMETRY)'
            else:
                create_table_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" (id SERIAL PRIMARY KEY, geom GEOMETRY)'
            
            cursor.execute(create_table_sql)
            conn.commit()

            # Insert records
            for shape_record in shp.shapeRecords():
                geometry = shape_record.shape.__geo_interface__
                attributes = dict(zip(field_names, shape_record.record))

                columns = ", ".join([f'"{key}"' for key in attributes.keys()])
                values_placeholders = ", ".join(["%s"] * len(attributes))
                
                geom_json = json.dumps(geometry)
                
                if columns:  # Only add columns if there are attributes
                    insert_sql = f'INSERT INTO "{table_name}" (geom, {columns}) VALUES (ST_SetSRID(ST_GeomFromGeoJSON(%s), {srid}), {values_placeholders})'
                    cursor.execute(insert_sql, [geom_json] + list(attributes.values()))
                else:
                    insert_sql = f'INSERT INTO "{table_name}" (geom) VALUES (ST_SetSRID(ST_GeomFromGeoJSON(%s), {srid}))'
                    cursor.execute(insert_sql, [geom_json])

        conn.commit()

    except Exception as e:
        print(f"Error during Shapefile processing: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

    print(f"Shapefile data has been processed and inserted into table {table_name}.")

    
def preprocess_geotiff(geotiff_path, target_srid, output_path):
    # Define the target CRS using pyproj
    target_crs = CRS(f"EPSG:{target_srid}")

    with rasterio.open(geotiff_path) as src:
        # Define source CRS from the GeoTIFF file
        src_crs = CRS.from_string(src.crs.to_proj4())

        # Calculate transform and dimensions for the target CRS
        transform, width, height = calculate_default_transform(
            src_crs, 
            target_crs, 
            src.width, 
            src.height, 
            *src.bounds
        )
        
        # Update metadata to reflect new CRS and dimensions
        kwargs = src.meta.copy()
        kwargs.update({
            'crs': target_crs.to_proj4(),
            'transform': transform,
            'width': width,
            'height': height
        })
        
        with rasterio.open(output_path, 'w', **kwargs) as dst:
            for band in src.indexes:
                reproject(
                    source=rasterio.band(src, band),
                    destination=rasterio.band(dst, band),
                    src_crs=src_crs.to_proj4(),
                    dst_crs=target_crs.to_proj4(),
                    resampling=Resampling.nearest
                )

    print(f"GeoTIFF reprojected to EPSG:{target_srid} and saved to {output_path}")

def insert_geotiff_to_postgis(geotiff_path, table_name, srid=4326):
    conn = psycopg2.connect(
        host="10.238.0.3",
        port="5432",
        dbname="nyoba",
        user="postgres",
        password="15032003"
    )
    cursor = conn.cursor()

    try:
        cursor.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        conn.commit()

        # Preprocess the GeoTIFF to ensure it is in the correct SRID
        temp_geotiff_path = "temp_geotiff.tif"
        preprocess_geotiff(geotiff_path, srid, temp_geotiff_path)

        # Construct the raster2pgsql command
        raster2pgsql_command = [
            "C:\\Program Files\\PostgreSQL\\16\\bin\\raster2pgsql.exe",
            "-s", str(srid),  # Use the provided SRID
            "-I",
            "-C",
            temp_geotiff_path,
            table_name
        ]

        # Run the command and get the SQL output
        raster2pgsql_output = subprocess.check_output(raster2pgsql_command).decode('utf-8')

        # Execute the SQL output to insert data
        cursor.execute(raster2pgsql_output)
        conn.commit()

    except Exception as e:
        print("Error during GeoTIFF insertion:", e)
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

        # Clean up temporary file
        if os.path.exists(temp_geotiff_path):
            os.remove(temp_geotiff_path)

    print("GeoTIFF data has been inserted into the database using raster2pgsql.")
    
    
def normalize_table_name(name):
    return re.sub(r'\W+', '_', name.lower())

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_size = 0
    chunk_size = 1024 * 1024  # 1MB
    tmp_dir = tempfile.mkdtemp()

    try:
        file_path = os.path.join(tmp_dir, file.filename)
        
        with open(file_path, "wb") as tmp:
            # Read the file in chunks to determine the size
            while content := await file.read(chunk_size):
                file_size += len(content)
                if file_size > MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=413, detail="File size exceeds the maximum limit")
                tmp.write(content)

        file_ext = os.path.splitext(file.filename)[1].lower()
        # table_name = normalize_table_name(os.path.splitext(file.filename)[0])
        table_name = os.path.splitext(file.filename)[0]

        if file_ext == '.zip':
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(tmp_dir)

            shapefile_path = None
            for file_name in os.listdir(tmp_dir):
                if file_name.endswith(".shp"):
                    shapefile_path = os.path.join(tmp_dir, file_name)
                    break

            if shapefile_path is None:
                raise HTTPException(status_code=400, detail="No shapefile found in the uploaded zip file")

            process_shapefile(shapefile_path, table_name)
            return {"message": "Shapefile uploaded and processed successfully"}
        elif file_ext in ['.tif', '.tiff']:
            table_name = normalize_table_name(table_name)
            insert_geotiff_to_postgis(file_path, table_name)
            return {"message": "GeoTIFF uploaded and processed successfully"}
        elif file_ext == '.json' or file_ext == '.geojson':
            # Handle GeoJSON upload
            process_geojson(file_path, table_name)
            return {"message": "GeoJSON uploaded and processed successfully"}      
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")

    except HTTPException as e:
        raise e
    except Exception as e:
        print("Error:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        shutil.rmtree(tmp_dir)

@app.get("/data/{table_name}")
async def get_data(table_name: str):
    try:
        conn = psycopg2.connect(
        host="10.238.0.3",
        port="5432",
        dbname="nyoba",
        user="postgres",
        password="15032003"
    )
        cursor = conn.cursor()

        query = f'SELECT id, ST_AsGeoJSON(geom) as geom, * FROM "{table_name}"'
        cursor.execute(query)
        rows = cursor.fetchall()

        features = []
        for row in rows:
            geom = geojson.loads(row[1])
            properties = {desc[0]: row[idx + 2] for idx, desc in enumerate(cursor.description[2:])}
            feature = geojson.Feature(id=row[0], geometry=geom, properties=properties)
            features.append(feature)

        feature_collection = geojson.FeatureCollection(features)
        cursor.close()
        conn.close()
        return feature_collection
    except Exception as e:
        print("Error:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")


color_palette = [
    "609C60", "609C60", "5C985C", "589558", "549254", "508E50", "4C8B4C", "488848", "448544", "408140",
    "3C7E3C", "387B38", "347834", "317431", "2D712D", "296E29", "256B25", "216721", "1D641D", "196119",
    "155E15", "115A11", "0D570D", "095409", "065106", "609C60", "5C985C", "589558", "549254", "508E50",
    "4C8B4C", "488848", "448544", "408140", "3C7E3C", "387B38", "347834", "317431", "2D712D", "296E29",
    "256B25", "216721", "1D641D", "196119", "155E15", "115A11", "0D570D", "095409", "065106", "609C60",
    "5C985C", "589558", "549254", "508E50", "4C8B4C", "488848", "448544", "408140", "3C7E3C", "387B38",
    "347834", "317431", "2D712D", "296E29", "256B25", "216721", "1D641D", "196119", "155E15", "115A11",
    "0D570D", "095409", "065106", "000000", "000000", "000000", "BFC0C0", "B7BDC2", "FEFECC", "FAFAC3",
    "F7F7BB", "F4F4B3", "F1F1AB", "EDEDA2", "EAEA9A", "E7E792", "E4E48A", "E0E081", "DDDD79", "DADA71",
    "D7D769", "D3D360", "D0D058", "CDCD50", "CACA48", "609C60", "5C985C", "589558", "549254", "508E50",
    "4C8B4C", "609C60", "5C985C", "589558", "549254", "508E50", "4C8B4C", "488848", "448544", "408140",
    "3C7E3C", "387B38", "347834", "317431", "2D712D", "296E29", "256B25", "216721", "1D641D", "196119",
    "155E15", "115A11", "0D570D", "095409", "065106", "609C60", "5C985C", "589558", "549254", "508E50",
    "4C8B4C", "488848", "448544", "408140", "3C7E3C", "387B38", "347834", "317431", "2D712D", "296E29",
    "256B25", "216721", "1D641D", "196119", "155E15", "115A11", "0D570D", "095409", "065106", "609C60",
    "5C985C", "589558", "549254", "508E50", "4C8B4C", "488848", "448544", "408140", "3C7E3C", "387B38",
    "347834", "317431", "2D712D", "296E29", "256B25", "216721", "1D641D", "196119", "155E15", "115A11",
    "0D570D", "095409", "065106", "000000", "000000", "000000", "1964EB", "1555E4", "1147DD", "0E39D6",
    "0A2ACF", "071CC8", "030EC1", "0000BA", "0000BA", "1964EB", "1555E4", "1147DD", "000000", "000000",
    "000000", "000000", "000000", "000000", "000000", "000000", "000000", "000000", "000000", "000000",
    "000000", "000000", "000000", "000000", "000000", "000000", "000000", "000000", "000000", "000000",
    "000000", "000000", "000000", "000000", "000000", "000000", "000000", "000000", "ff2828", "ffffff",
    "ffffff", "ff2828", "ff7d00", "fac800", "fac800", "fac800", "609C60", "609C60", "64dcdc", "00ffff",
    "00ffff", "00ffff", "111133"
]

color_palette_rgb = [mcolors.hex2color('#' + hex_color) for hex_color in color_palette]

cmap = mcolors.ListedColormap(color_palette_rgb)


@app.get("/raster/{table_name}")
async def get_raster(table_name: str):
    try:
        conn = psycopg2.connect(
            host="10.238.0.3",
            port="5432",
            dbname="nyoba",
            user="postgres",
            password="15032003"
        )
        cursor = conn.cursor()
        table_name = normalize_table_name(table_name)

        query = f'SELECT ST_AsGDALRaster(rast, \'GTiff\') FROM "{table_name}"'
        cursor.execute(query)
        raster_rows = cursor.fetchall()

        raster_images = []
        converted_bounds = []
        for row in raster_rows:
            raster_data = row[0]

            with MemoryFile(raster_data) as memfile:
                with memfile.open() as dataset:
                    data = dataset.read()

                    if data is None or data.shape[0] == 0:
                        raise HTTPException(status_code=404, detail="No valid raster data available.")

                    num_bands = data.shape[0]
                    print(f"Number of bands: {num_bands}")

                    if num_bands == 1:
                        # Normalisasi data band tunggal
                        band = data[0]
                        band_normalized = (band - band.min()) / (band.max() - band.min())

                        # Terapkan colormap (misalnya 'viridis')
                        
                        rgba_image = cmap(band_normalized)
                        rgb_image = (rgba_image[:, :, :3] * 255).astype('uint8')  

                        # Buat gambar menggunakan PIL
                        image = Image.fromarray(rgb_image)
                    else:
                        # Tangani multi-band seperti sebelumnya
                        bands = []
                        for band in data:
                            band_normalized = ((band - band.min()) / (band.max() - band.min()) * 255).astype('uint8')
                            bands.append(band_normalized)

                        if len(bands) >= 3:
                            image = Image.merge('RGB', [Image.fromarray(band) for band in bands[:3]])
                        elif len(bands) == 2:
                            zeros_band = np.zeros_like(bands[0], dtype='uint8')
                            image = Image.merge('RGB', [Image.fromarray(bands[0]), Image.fromarray(bands[1]), Image.fromarray(zeros_band)])
                        else:
                            image = Image.merge('RGB', [Image.fromarray(bands[0])] * 3)

                    # Simpan gambar ke byte array
                    img_byte_array = BytesIO()
                    image.save(img_byte_array, format='PNG')
                    raster_images.append(img_byte_array.getvalue())

                    bbox = dataset.bounds

                    # CRS transformation (tetap sama)
                    transformer = Transformer.from_crs("epsg:4326", "epsg:4326", always_xy=True)
                    bounds = [[bbox.left, bbox.bottom], [bbox.right, bbox.top]]
                    converted_bounds = [transformer.transform(*coord) for coord in bounds]
                    converted_bounds = [[converted_bounds[0][1], converted_bounds[0][0]], [converted_bounds[1][1], converted_bounds[1][0]]]

        cursor.close()
        conn.close()

        if not raster_images:
            raise HTTPException(status_code=404, detail="No raster images available.")

        encoded_raster_images = [base64.b64encode(img).decode() for img in raster_images]

        return JSONResponse(content={"raster_images": encoded_raster_images, "bounds": converted_bounds})
    except HTTPException:
        raise
    except Exception as e:
        print("Error:", e)
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
@app.get("/geojson/{table_name}")
async def get_geojson(table_name: str):
    try:
        geojson_data = get_geojson_from_table(table_name)
        return geojson_data
    except psycopg2.Error as e:
        error_message = f"Database error: {e}"
        print(error_message)
        raise HTTPException(status_code=500, detail=error_message)
    except Exception as e:
        error_message = f"Unexpected error: {e}"
        print(error_message)
        raise HTTPException(status_code=500, detail=error_message)
    
# from torch.utils.data import Dataset, DataLoader
# from torchvision import transforms
# from PIL import Image

# # Define a custom dataset class
# class CustomDataset(Dataset):
#     def __init__(self, images_dir, annotations_dir, transform=None):
#         self.images_dir = images_dir
#         self.annotations_dir = annotations_dir
#         self.transform = transform
#         self.images = sorted(os.listdir(images_dir))
#         self.annotations = sorted(os.listdir(annotations_dir))

#     def __len__(self):
#         return len(self.images)

#     def __getitem__(self, idx):
#         img_path = os.path.join(self.images_dir, self.images[idx])
#         annot_path = os.path.join(self.annotations_dir, self.annotations[idx])
        

#         if not os.path.exists(img_path) or not os.path.exists(annot_path):
#             raise FileNotFoundError(f"File not found: {img_path} or {annot_path}")
#         # Open the image
        

#         image = Image.open(img_path).convert("RGB")
        
#         # Load the corresponding annotation file (e.g., bounding boxes, labels)
#         boxes, labels, masks = self.parse_annotations(annot_path)
        
#         if self.transform:
#             image = self.transform(image)
        
#         # Return a dictionary with the necessary information
#         return {
#             "image": image,
#             "boxes": boxes,
#             "labels": labels,
#             "masks": masks
#         }
#     def parse_annotations(self, annot_path):
#         boxes = []
#         labels = []

#         print(f"Parsing annotations from: {annot_path}")  # Debug print

#         with open(annot_path, 'r') as file:
#             for line in file:
#                 line = line.strip()

#                 if line:
#                     print(f"Line: {line}")  # Print each line being processed

#                     try:
#                         # Match the expected format
#                         # We expect the format: "(x1,y1),(x2,y2),class_id"
#                         parts = line.rsplit(',', 1)  # Split at the last comma
#                         if len(parts) != 2:
#                             print(f"Unexpected format in line: {line}")  # Debug print
#                             continue

#                         coords, class_id_str = parts
#                         class_id = int(class_id_str.strip())  # Convert class ID to int

#                         # Clean and split coordinates
#                         coords = coords.replace('(', '').replace(')', '').split('),(')
#                         if len(coords) != 2:
#                             print(f"Unexpected coordinate format in line: {line}")  # Debug print
#                             continue

#                         # Further clean up coordinates to handle extra spaces
#                         x1, y1 = map(int, coords[0].strip().split(','))
#                         x2, y2 = map(int, coords[1].strip().split(','))

#                         # Append to boxes and labels
#                         boxes.append([x1, y1, x2, y2])
#                         labels.append(class_id)

#                         print(f"Parsed box: {boxes[-1]}, label: {labels[-1]}")  # Debug print for parsed values

#                     except ValueError as e:
#                         print(f"ValueError parsing line '{line}': {e}")  # More specific error handling
#                     except Exception as e:
#                         print(f"Error parsing line '{line}': {e}")

#         print(f"Parsed boxes: {boxes}")  # Debug print for boxes
#         print(f"Parsed labels: {labels}")  # Debug print for labels

#         return boxes, labels, None  # No masks returned




# # Define transformations for the images
# transform = transforms.Compose([
#     transforms.Resize((224, 224)),
#     transforms.ToTensor(),
# ])

# # Initialize the dataset
# dataset = CustomDataset(
#     images_dir='./NWPU VHR-10 dataset/positive image set', 
#     annotations_dir='./NWPU VHR-10 dataset/ground truth',
#     transform=transform
# )

# # Custom collate function for object detection (if needed)
# def collate_fn_detection(batch):
#     images = [item['image'] for item in batch]
#     boxes = [item['boxes'] for item in batch]
#     labels = [item['labels'] for item in batch]
#     masks = [item['masks'] for item in batch]
   
#     return {
#         "images": images,
#         "boxes": boxes,
#         "labels": labels,
#         "masks": masks
#     }

# # Initialize the DataLoader
# dataloader = DataLoader(
#     dataset,
#     batch_size=128,
#     shuffle=True,
#     num_workers=0,  # Set to 0 for debugging
#     collate_fn=collate_fn_detection,
# )

# # Training loop
# for batch in dataloader:
#     images = batch["images"]  # list of images
#     boxes = batch["boxes"]  # list of boxes
#     labels = batch["labels"]  # list of labels
#     masks = batch["masks"]  # list of masks
#     # Print batch information
#     print(f"Batch loaded: {len(images)} images")
#     print(f"First image size: {images[0].shape if images else 'No image'}")
#     print(f"First batch boxes: {boxes[0] if boxes else 'No boxes'}")
#     print(f"First batch labels: {labels[0] if labels else 'No labels'}")

