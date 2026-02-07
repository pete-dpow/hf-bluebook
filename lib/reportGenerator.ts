import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface ReportSection {
  id: string;
  label: string;
  content: string;
}

export interface ReportMeta {
  title: string;
  project: string;
  preparedBy: string;
  reportDateISO: string;
}

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const escapeRtf = (str: string): string => {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
};

export async function generateDocx(meta: ReportMeta, sections: ReportSection[]) {
  let rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\fswiss Arial;}{\\f1\\fswiss\\fcharset0 Calibri;}}
{\\colortbl;\\red79\\green165\\blue154;\\red0\\green0\\blue0;}
\\viewkind4\\uc1\\pard\\f1\\fs28\\b ${escapeRtf(meta.title)}\\b0\\fs22\\par
\\par
`;

  if (meta.project) {
    rtfContent += `\\b Project:\\b0  ${escapeRtf(meta.project)}\\par\n`;
  }

  if (meta.preparedBy) {
    rtfContent += `\\b Prepared by:\\b0  ${escapeRtf(meta.preparedBy)}\\par\n`;
  }

  rtfContent += `\\b Date:\\b0  ${escapeRtf(formatDate(meta.reportDateISO))}\\par\n`;
  rtfContent += `\\par\n\\par\n`;

  sections.forEach((section) => {
    rtfContent += `\\fs26\\b ${escapeRtf(section.label)}\\b0\\fs22\\par\n`;
    const paragraphs = section.content.split('\n\n');
    paragraphs.forEach((para) => {
      if (para.trim()) {
        rtfContent += `${escapeRtf(para.trim())}\\par\n`;
      }
    });
    rtfContent += `\\par\n`;
  });

  rtfContent += `}`;

  return Buffer.from(rtfContent, 'utf-8');
}

export async function generatePdf(meta: ReportMeta, sections: ReportSection[]) {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  let page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  let yPosition = height - 50;
  const margin = 50;
  const maxWidth = width - 2 * margin;

  const drawText = (text: string, size: number, font: any) => {
    const cleanText = text.replace(/[\r\n]+/g, ' ').trim();

    if (yPosition < 100) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - 50;
    }

    const lines = [];
    const words = cleanText.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      let testWidth;
      try {
        testWidth = font.widthOfTextAtSize(testLine, size);
      } catch (e) {
        testWidth = maxWidth + 1;
      }

      if (testWidth > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    for (const line of lines) {
      if (yPosition < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        yPosition = height - 50;
      }

      try {
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size,
          font,
          color: rgb(0.16, 0.16, 0.16),
        });
      } catch (e) {
        console.error('Error drawing text:', e);
      }
      yPosition -= size + 6;
    }
  };

  page.drawText(meta.title, {
    x: margin + 10,
    y: yPosition,
    size: 18,
    font: timesRomanBold,
    color: rgb(0.16, 0.16, 0.16),
  });

  page.drawRectangle({
    x: margin,
    y: yPosition - 5,
    width: 3,
    height: 22,
    color: rgb(0.31, 0.65, 0.60),
  });

  yPosition -= 35;

  if (meta.project) {
    drawText(`Project: ${meta.project}`, 11, timesRomanFont);
    yPosition -= 5;
  }

  if (meta.preparedBy) {
    drawText(`Prepared by: ${meta.preparedBy}`, 11, timesRomanFont);
    yPosition -= 5;
  }

  drawText(`Date: ${formatDate(meta.reportDateISO)}`, 11, timesRomanFont);
  yPosition -= 25;

  sections.forEach((section, index) => {
    if (yPosition < 150) {
      page = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - 50;
    }

    page.drawText(section.label, {
      x: margin,
      y: yPosition,
      size: 13,
      font: timesRomanBold,
      color: rgb(0.16, 0.16, 0.16),
    });
    yPosition -= 25;

    drawText(section.content, 11, timesRomanFont);
    yPosition -= 15;

    if (index < sections.length - 1) {
      if (yPosition < 120) {
        page = pdfDoc.addPage([595.28, 841.89]);
        yPosition = height - 50;
      }

      page.drawLine({
        start: { x: margin, y: yPosition },
        end: { x: width - margin, y: yPosition },
        thickness: 0.5,
        color: rgb(0.9, 0.91, 0.92),
        dashArray: [3, 3],
      });
      yPosition -= 20;
    }
  });

  const pages = pdfDoc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`${meta.project || 'dpow.ai'}`, {
      x: margin,
      y: 30,
      size: 9,
      font: timesRomanFont,
      color: rgb(0.29, 0.29, 0.29),
    });
    p.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: width - margin - 60,
      y: 30,
      size: 9,
      font: timesRomanFont,
      color: rgb(0.29, 0.29, 0.29),
    });
  });

  return await pdfDoc.save();
}
