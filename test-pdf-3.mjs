import PDFParse from 'pdf-parse';
import fs from 'fs';

async function test() {
  console.log("PDFParse:", PDFParse);
  if (PDFParse.PDFParse) {
    console.log("Found PDFParse class!");
  }
}
test();
