# get the size of an image
from PIL import Image
import sys

def get_image_size(image_path):
    with Image.open(image_path) as img:
        width, height = img.size
    return width, height

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python3 get_image_size.py image_path')
        sys.exit(1)
    image_path = sys.argv[1]
    width, height = get_image_size(image_path)
    print(f'Image size: {width} x {height}')