# Assets Folder

This folder contains all static assets used in the ValetEase mobile app.

## Folder Structure

```
assets/
├── icons/          # Icon files (SVG, PNG)
│   ├── park.png
│   ├── pickup.png
│   ├── profile.png
│   └── ...
├── images/         # Image files (PNG, JPG)
│   ├── logo.png
│   ├── splash.png
│   └── ...
└── README.md       # This file
```

## Usage

### Importing Icons/Images

```typescript
import parkIcon from '../assets/icons/park.png';
import logo from '../assets/images/logo.png';

// In component
<Image source={parkIcon} style={styles.icon} />
```

### Recommended Formats

- **Icons**: PNG with transparent background (24x24, 48x48, 72x72 for different densities)
- **Images**: PNG or JPG
- **Logos**: PNG with transparent background

### Naming Convention

- Use lowercase with hyphens: `park-icon.png`, `user-profile.png`
- Include size suffix if multiple sizes: `logo-48.png`, `logo-72.png`
- Use descriptive names: `parking-completed.png` instead of `icon1.png`

## Adding New Assets

1. Place the file in the appropriate subfolder (`icons/` or `images/`)
2. Follow the naming convention
3. Update this README if adding a new category
