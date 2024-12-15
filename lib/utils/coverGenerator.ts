interface CoverOptions {
  title: string;
  fileType: string;
}

// Soft, muted color palettes inspired by book covers
const colorPalettes = [
  ['#E8B4B8', '#D49BA6'], // Dusty Rose
  ['#B4C8E8', '#92A8CD'], // Soft Blue
  ['#D6E8B4', '#B8CD92'], // Sage Green
  ['#E8D4B4', '#CDBA92'], // Warm Sand
  ['#C8B4E8', '#A692CD'], // Lavender
  ['#B4E8D4', '#92CDC0'], // Mint
  ['#E8B4D4', '#CD92B5'], // Mauve
  ['#B4E8E8', '#92CDCD']  // Aqua
];

// Stylized plant/leaf elements in the style of the reference
const plantElements = [
  // Simple leaf branch
  `<path d="M50,80 C50,60 60,50 80,50 C60,50 50,40 50,20" style="fill:none;stroke-width:2"/>
   <path d="M45,75 C35,65 35,55 45,45" style="fill:none;stroke-width:1.5"/>
   <path d="M55,75 C65,65 65,55 55,45" style="fill:none;stroke-width:1.5"/>`,
   
  // Elegant branch with leaves
  `<path d="M40,80 C60,60 60,40 40,20 M40,50 C60,50 80,40 100,50" style="fill:none;stroke-width:2"/>
   <path d="M45,70 C55,60 55,50 45,40 M75,50 C85,45 85,35 75,30" style="fill:none;stroke-width:1.5"/>`,
   
  // Minimalist plant
  `<path d="M50,80 L50,40 M40,60 L60,60 M35,50 L65,50 M40,40 L60,40" style="fill:none;stroke-width:1.5"/>`,
];

function generatePlantElement(color: string): string {
  const plant = plantElements[Math.floor(Math.random() * plantElements.length)];
  return `
    <g transform="translate(100, 240) scale(1.2)" style="stroke:${color};opacity:0.7;stroke-width:1.5">
      ${plant}
    </g>
  `;
}

// Frame border generator
function generateFrame(width: number, height: number, color: string): string {
  const margin = 20;
  const innerMargin = 25;
  return `
    <!-- Outer frame -->
    <rect x="${margin}" y="${margin}" 
          width="${width - 2 * margin}" height="${height - 2 * margin}"
          style="fill:none;stroke:${color};stroke-width:1;opacity:0.4"/>
    <!-- Inner frame -->
    <rect x="${innerMargin}" y="${innerMargin}" 
          width="${width - 2 * innerMargin}" height="${height - 2 * innerMargin}"
          style="fill:none;stroke:${color};stroke-width:0.5;opacity:0.3"/>
  `;
}

export function generateBookCover({ 
  title, 
  fileType
}: CoverOptions): string {
  // Select a random color palette
  const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
  const [lightColor, darkColor] = palette;
  
  // Clean up the file type to show only the extension
  const cleanFileType = fileType.toUpperCase().replace('APPLICATION/', '').replace('TEXT/', '');
  
  // Create an SVG string with the cover design
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="400">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${lightColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${darkColor};stop-opacity:1" />
        </linearGradient>
        <!-- Subtle texture overlay -->
        <filter id="paper" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise"/>
          <feColorMatrix type="matrix" values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1  0 0 0 0.1 0" />
          <feComposite operator="in" in2="SourceGraphic"/>
        </filter>
      </defs>
      
      <!-- Background with gradient -->
      <rect width="100%" height="100%" fill="url(#grad)"/>
      
      <!-- Add subtle texture -->
      <rect width="100%" height="100%" filter="url(#paper)" fill="none"/>
      
      <!-- Decorative frames -->
      ${generateFrame(300, 400, 'white')}
      
      <!-- Plant decoration - moved up and made more visible -->
      ${generatePlantElement('white')}
      
      <!-- Title and File Type area -->
      <foreignObject x="40" y="60" width="220" height="240">
        <div xmlns="http://www.w3.org/1999/xhtml" 
             style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;">
          <span style="color:white;font-family:system-ui;font-size:28px;font-weight:700;text-transform:uppercase;
                       letter-spacing:2px;line-height:1.3;text-shadow:0 2px 4px rgba(0,0,0,0.2);margin-bottom:15px;">
            ${title}
          </span>
          <span style="color:white;font-family:system-ui;font-size:16px;opacity:0.9;letter-spacing:3px;
                       text-shadow:0 1px 2px rgba(0,0,0,0.2);">
            -${cleanFileType}-
          </span>
        </div>
      </foreignObject>
    </svg>
  `;

  // Convert SVG to base64 data URL
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return dataUrl;
} 