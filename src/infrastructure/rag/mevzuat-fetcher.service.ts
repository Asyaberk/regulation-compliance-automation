import { Injectable } from '@nestjs/common';
import axios from 'axios';

//Service for fetching external legal regulation texts from mevzuat.gov.tr anduses from RAM

@Injectable()
export class MevzuatGovTrFetcherService{
    //Fetches regulation content from a public URL and converts it into raw plain text in RAM

    async fetchFromUrl(url: string): Promise<string>{
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const buffer = Buffer.from(response.data);
            const contentType = String(response.headers['content-type'] || '');
            const isPdf = url.toLowerCase().endsWith('.pdf') || contentType.includes('pdf');

            
            if (isPdf) {
                return this.parsePdfBufferInMemory(buffer);
            }

            //Convert HTML text buffer directly to string
            const rawHtml = buffer.toString('utf-8');
            return this.cleanHtmlTags(rawHtml);

        } catch (error) {
            throw new Error(`Failed to fetch regulations from URL [${url}]: ${(error as Error).message}`);
        }
    }

    //parses pdf bytes to RAM
    private parsePdfBufferInMemory(buffer: Buffer): string {
        //text extracton from pdf buffer
        const textContent = buffer.toString('utf-8');
        const cleaned = textContent.replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u0180-\u024F\n\r\t]/g, ' ');
        return this.cleanHtmlTags(cleaned);
    }

    //html tags and whitespace
    private cleanHtmlTags(html: string): string{
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }


}




