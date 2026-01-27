from PIL import Image, ImageDraw

def create_icon(size, filename, is_favicon=False):
    # Create RGBA image with purple gradient background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Purple gradient background
    for y in range(size):
        r = int(88 + (138 - 88) * y / size)
        g = int(28 + (43 - 28) * y / size)
        b = int(135 + (226 - 135) * y / size)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    
    # Add "4U" text centered
    center = size // 2
    text_size = size // 3
    
    # Draw simple "4U" using shapes
    # "4" shape
    x4 = center - text_size // 2
    y4 = center - text_size // 3
    thickness = max(2, size // 40)
    
    # Vertical line of 4
    draw.rectangle([x4, y4, x4 + thickness, y4 + text_size], fill=(255, 255, 255, 255))
    # Horizontal line of 4
    draw.rectangle([x4 - text_size//3, y4 + text_size//2, x4 + thickness, y4 + text_size//2 + thickness], fill=(255, 255, 255, 255))
    # Top diagonal of 4
    draw.rectangle([x4 - text_size//3, y4, x4 - text_size//3 + thickness, y4 + text_size//2 + thickness], fill=(255, 255, 255, 255))
    
    # "U" shape
    xu = center + text_size // 4
    yu = y4
    # Left vertical of U
    draw.rectangle([xu, yu, xu + thickness, yu + text_size], fill=(255, 255, 255, 255))
    # Right vertical of U
    draw.rectangle([xu + text_size//2, yu, xu + text_size//2 + thickness, yu + text_size], fill=(255, 255, 255, 255))
    # Bottom of U
    draw.rectangle([xu, yu + text_size - thickness, xu + text_size//2 + thickness, yu + text_size], fill=(255, 255, 255, 255))
    
    # Save as PNG with maximum compatibility
    img.save(filename, 'PNG', optimize=False)
    print(f"Created {filename} ({size}x{size})")

# Generate all icons
create_icon(1024, 'icon.png')
create_icon(1024, 'adaptive-icon.png')
create_icon(1024, 'splash-icon.png')
create_icon(48, 'favicon.png', is_favicon=True)

print("All icons generated successfully!")
