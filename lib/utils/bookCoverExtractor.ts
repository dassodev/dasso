import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

export async function extractEpubCover(file: File): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const content = await zip.loadAsync(arrayBuffer);
    
    // First, try to find container.xml
    const containerFile = content.file('META-INF/container.xml');
    if (!containerFile) {
      return null;
    }

    // Parse container.xml to find the OPF file
    const containerXml = await containerFile.async('text');
    const parser = new DOMParser();
    const container = parser.parseFromString(containerXml, 'text/xml');
    const opfPath = container.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
    
    if (!opfPath) {
      return null;
    }

    // Read and parse the OPF file
    const opfFile = content.file(opfPath);
    if (!opfFile) {
      return null;
    }

    const opfContent = await opfFile.async('text');
    const opf = parser.parseFromString(opfContent, 'text/xml');
    
    // Get the manifest items
    const manifest = Array.from(opf.getElementsByTagName('manifest')[0].getElementsByTagName('item'));
    
    // Look for cover image in different ways
    let coverPath: string | null = null;

    // 1. Try to find meta cover tag
    const metaTags = Array.from(opf.getElementsByTagName('meta'));
    const coverMeta = metaTags.find(meta => 
      meta.getAttribute('name') === 'cover' || 
      meta.getAttribute('property') === 'cover-image'
    );
    
    if (coverMeta) {
      const coverId = coverMeta.getAttribute('content');
      const coverItem = manifest.find(item => item.getAttribute('id') === coverId);
      if (coverItem) {
        coverPath = coverItem.getAttribute('href') || null;
      }
    }

    // 2. If no cover meta, look for item with media-type image and properties=cover-image
    if (!coverPath) {
      const coverItem = manifest.find(item => {
        const mediaType = item.getAttribute('media-type') || '';
        const properties = item.getAttribute('properties') || '';
        return mediaType.startsWith('image/') && properties.includes('cover-image');
      });
      
      if (coverItem) {
        coverPath = coverItem.getAttribute('href') || null;
      }
    }

    // 3. Last resort: look for any image with 'cover' in its ID or href
    if (!coverPath) {
      const coverItem = manifest.find(item => {
        const id = item.getAttribute('id') || '';
        const href = item.getAttribute('href') || '';
        const mediaType = item.getAttribute('media-type') || '';
        return mediaType.startsWith('image/') && 
               (id.toLowerCase().includes('cover') || href.toLowerCase().includes('cover'));
      });
      
      if (coverItem) {
        coverPath = coverItem.getAttribute('href') || null;
      }
    }

    if (!coverPath) {
      return null;
    }

    // Get the base directory of the OPF file
    const opfDir = opfPath.split('/').slice(0, -1).join('/');
    const fullCoverPath = opfDir ? `${opfDir}/${coverPath}` : coverPath;
    
    // Extract the cover image
    const coverFile = content.file(fullCoverPath);
    if (!coverFile) {
      return null;
    }

    // Convert the cover to base64
    const coverData = await coverFile.async('base64');
    const mediaType = coverFile.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mediaType};base64,${coverData}`;

  } catch (error) {
    console.error('Error extracting EPUB cover:', error);
    return null;
  }
}

export async function extractPdfCover(file: File): Promise<string | null> {
  try {
    // Dynamic import for PDF.js to avoid SSR issues
    const pdfjsLib = typeof window !== 'undefined' ? require('pdfjs-dist') : null;
    if (!pdfjsLib) {
      return null;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    // Set a reasonable scale for the cover image
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(600 / viewport.width, 800 / viewport.height);
    const scaledViewport = page.getViewport({ scale });

    // Create a canvas to render the page
    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    // Render the page to canvas
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise;

    // Convert canvas to base64 image
    const coverData = canvas.toDataURL('image/jpeg', 0.8);
    return coverData;

  } catch (error) {
    console.error('Error extracting PDF cover:', error);
    return null;
  }
} 