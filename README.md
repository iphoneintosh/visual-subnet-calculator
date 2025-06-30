# Visual Subnet Calculator

A modern, interactive web-based subnet calculator with visual subnet hierarchy representation. This tool helps network administrators and students understand and plan IP subnet allocations with an intuitive visual interface.

## Features

### Core Functionality
- **Visual Subnet Division**: Click on subnet cells to divide them into smaller subnets
- **Subnet Joining**: Click on parent cells to join child subnets back together
- **Hierarchical Visualization**: See the complete subnet tree structure at a glance
- **Binary Format Display**: Toggle between decimal and binary IP address formats

### Network Information Display
- Subnet address with CIDR notation
- Network mask
- Network address
- Broadcast address
- IP address ranges
- Usable host IP ranges
- Total IP count
- Usable host count

### Organization Features
- **Drag-and-Drop Labels**: Organize subnets with colored labels (A-J)
- **Hierarchical Highlighting**: Hover to see parent and child subnet relationships
- **Save Configuration**: Save and share subnet configurations via URL
- **Column Visibility**: Toggle which information columns to display

## Usage

### Basic Operations
1. Enter a network address and subnet mask
2. Click on the rightmost visualization cell to divide a subnet
3. Click on parent visualization cells to join subnets
4. Drag colored labels onto subnet rows to organize them

### Keyboard Shortcuts
- None currently implemented

### Saving and Sharing
Click "Save Config" to copy a shareable URL that preserves:
- Network configuration
- Subnet hierarchy
- All assigned labels

## Technical Details

### Built With
- Pure HTML5, CSS3, and JavaScript
- Bootstrap 5.3 for UI components
- Bootstrap Icons for visual elements
- No backend required - runs entirely in the browser

### Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge

### Deployment
This application is automatically deployed to GitHub Pages when changes are pushed to the main branch.

## Development

### Local Development
1. Clone the repository
2. Open `index.html` in a web browser
3. No build process required

### File Structure
```
visual-subnet-calculator/
├── index.html           # Main HTML file
├── subnet-calculator.js # Core application logic
├── styles.css          # Custom styles
└── README.md           # This file
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Inspired by traditional subnet calculators
- Enhanced with modern web technologies for better user experience
- Designed for both educational and professional use