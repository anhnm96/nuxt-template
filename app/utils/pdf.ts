import html2pdf from 'html2pdf.js'
import { toCanvas } from 'html-to-image'

const defaultOptions = {
  filename: 'file.pdf',
  image: { type: 'jpeg', quality: 0.95 },
  enableLinks: true,
  jsPDF: {},
}

async function getCanvas(selector: string, options: any) {
  const worker = html2pdf().set(options).from(document.querySelector(selector)).toContainer()
  const container = await worker.get('container')

  container.style.removeProperty('position')
  const appendedNode = document.body.appendChild(container)

  // hide container
  worker.toCanvas()
  const content = container.querySelector(selector)

  // wait for all images to be loaded
  await checkImagesLoaded(appendedNode)
  const canvas = await toCanvas(content)

  document.body.removeChild(appendedNode)

  return canvas
}

export async function exportPdf(source: HTMLCanvasElement | string, options?: any) {
  // https://github.com/eKoopmans/html2pdf.js/tree/main?tab=readme-ov-file#options
  const mergedOptions = {
    ...defaultOptions,
    ...options,
  }

  if (source instanceof HTMLCanvasElement) {
    return html2pdf().set(mergedOptions).from(source).save()
  }

  const canvas = await getCanvas(source, mergedOptions)

  return html2pdf().set(mergedOptions).from(canvas).save()
}

export async function getPdf(selector: string, options?: any): Promise<{ blob: Blob, canvas: HTMLCanvasElement }> {
  // https://github.com/eKoopmans/html2pdf.js/tree/main?tab=readme-ov-file#options
  const mergedOptions = {
    ...defaultOptions,
    ...options,
  }

  const canvas = await getCanvas(selector, mergedOptions)

  const blob = await html2pdf().set(mergedOptions).from(canvas).outputPdf('blob', mergedOptions.filename)

  return { blob, canvas }
}

function checkImagesLoaded(element: HTMLElement) {
  return new Promise<void>((resolve) => {
    // Get all the images inside the specified element
    const images = element.getElementsByTagName('img')

    // Track the total number of images and how many have loaded
    let loadedCount = 0

    // Check if there are no images
    if (images.length === 0) {
      resolve() // No images to load, considered finished
    }

    // Function to check if an image has loaded
    function imageLoaded() {
      loadedCount++

      if (loadedCount === images.length) {
        resolve()
      }
    }

    // Attach the load event to each image
    for (let i = 0; i < images.length; i++) {
      // Check if the image has already been loaded (in case the load event already triggered)
      if (images[i]?.complete) {
        imageLoaded() // If image is already loaded, count it as loaded
      } else {
        // Otherwise, add an event listener for the load event
        images[i]?.addEventListener('load', imageLoaded)
      }
    }
  })
}
