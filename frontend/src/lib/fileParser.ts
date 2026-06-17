import * as pdfjsLib from 'pdfjs-dist';
// Set up the worker source - we need to point to the worker file in node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

import Tesseract from 'tesseract.js';
import mammoth from 'mammoth';

/**
 * Extracts raw text from various file formats
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
        if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
            return await extractTextFromPDF(file);
        } else if (
            fileName.endsWith('.png') ||
            fileName.endsWith('.jpg') ||
            fileName.endsWith('.jpeg') ||
            fileName.endsWith('.webp') ||
            fileType.startsWith('image/')
        ) {
            return await extractTextFromImage(file);
        } else if (
            fileName.endsWith('.docx') ||
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            return await extractTextFromDocx(file);
        } else if (fileName.endsWith('.txt') || fileType === 'text/plain') {
            return await file.text();
        } else if (fileName.endsWith('.csv') || fileType === 'text/csv') {
            // For CSV, we might want to let PapaParse handle it, but if we need text content:
            return await file.text();
        } else if (fileName.endsWith('.json') || fileType === 'application/json') {
            return await file.text();
        }

        throw new Error(`Unsupported file type: ${fileType}`);
    } catch (error) {
        console.error('Error extracting text from file:', error);
        throw error;
    }
};

const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
};

const extractTextFromImage = async (file: File): Promise<string> => {
    const { data: { text } } = await Tesseract.recognize(
        file,
        'eng',
        { logger: m => console.log(m) }
    );
    return text;
};

const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
};
