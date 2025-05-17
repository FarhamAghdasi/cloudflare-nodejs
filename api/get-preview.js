import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing or empty "url" parameter.' });
  }

  try {
    const finalUrl = decodeURIComponent(url);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
    };

    const isThemeForest = finalUrl.includes('themeforest.net');
    const isRTLTheme = finalUrl.includes('rtl-theme.com');

    if (isThemeForest) {
      const html1 = await (await fetch(finalUrl, { headers })).text();
      const previewLinkMatch = html1.match(/class=["']item-preview__preview-buttons["'][^>]*>.*?<a[^>]*href=["'](.*?)["']/s);

      if (!previewLinkMatch) {
        throw new Error('Preview link not found');
      }

      const previewUrl = new URL(previewLinkMatch[1], finalUrl).href;
      const html2 = await (await fetch(previewUrl, { headers })).text();
      const iframeSrcMatch = html2.match(/class=["']full-screen-preview__frame["'][^>]*src=["'](.*?)["']/s);

      if (!iframeSrcMatch) {
        throw new Error('Iframe src not found');
      }

      return res.json({ final_url: iframeSrcMatch[1] });

    } else if (isRTLTheme) {
      const html1 = await (await fetch(finalUrl, { headers })).text();
      const dom1 = new JSDOM(html1);
      const button = dom1.window.document.querySelector('button[data-type="ProductPreview"]');
      const dataTarget = button?.getAttribute('data-target');

      if (!dataTarget) throw new Error('ProductPreview button not found');

      const html2 = await (await fetch(dataTarget, { headers })).text();
      const dom2 = new JSDOM(html2);
      const iframe = dom2.window.document.querySelector('iframe#iframe');
      const iframeSrc = iframe?.getAttribute('src');

      if (!iframeSrc) throw new Error('Iframe src not found');

      return res.json({ final_url: iframeSrc });

    } else {
      return res.status(400).json({ error: 'Unsupported site.' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'An error occurred.', message: e.message });
  }
}
