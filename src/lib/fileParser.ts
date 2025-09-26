// Client-side file parsing utilities
export class FileParser {
  static async parsePDF(file: File): Promise<string> {
    try {
      // For client-side PDF parsing, we'll use a simpler approach
      // Since pdf-parse is designed for Node.js, we'll need an alternative

      // Create FormData and send to API route for server-side parsing
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file. Please try a different format.');
    }
  }

  static async parseDocx(file: File): Promise<string> {
    try {
      // For DOCX files, we'll also use the API route
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse DOCX');
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      throw new Error('Failed to parse DOCX file. Please try a different format.');
    }
  }

  static async parseText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read text file'));
      };
      reader.readAsText(file);
    });
  }

  static async parseFile(file: File): Promise<string> {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return this.parsePDF(file);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      return this.parseDocx(file);
    } else if (
      fileType === 'application/msword' ||
      fileName.endsWith('.doc')
    ) {
      throw new Error('Legacy .doc files are not supported. Please convert to .docx format.');
    } else if (
      fileType === 'text/plain' ||
      fileName.endsWith('.txt')
    ) {
      return this.parseText(file);
    } else {
      throw new Error('Unsupported file format. Please upload a DOCX or TXT file.');
    }
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const allowedExtensions = ['.pdf', '.docx', '.txt'];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    const hasValidType = allowedTypes.includes(file.type);

    if (!hasValidExtension && !hasValidType) {
      return {
        valid: false,
        error: 'Invalid file format. Please upload a PDF, DOCX, or TXT file.'
      };
    }

    return { valid: true };
  }
}