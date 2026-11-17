import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'dist');
const siteUrl = 'https://trooslash.github.io/';
const repository = 'https://github.com/TrooSlash/trooslash.github.io';
const languages = JSON.parse(await readFile(join(root, 'site/content.json'), 'utf8'));
const projects = JSON.parse(await readFile(join(root, 'site/projects.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const stylesheet = await readFile(join(root, 'site/style.css'));
const styleVersion = createHash('sha256').update(stylesheet).digest('hex').slice(0, 10);
const alternates = Object.entries(languages).map(([lang, text]) => `<link rel="alternate" hreflang="${lang}" href="${siteUrl}${text.path}">`).join('\n');

function renderProject(project, lang, prefix) {
  const text = languages[lang];
  const info = project[lang];
  return `<article class="project" aria-labelledby="${project.id}-title">
  <div class="project-copy">
    <p class="project-meta">${escape(project.platform)} · ${escape(project.category)}</p>
    <div class="project-title"><img src="${prefix}assets/${escape(project.icon)}" width="38" height="38" alt=""><h2 id="${project.id}-title">${escape(project.name)}</h2></div>
    <p class="description">${escape(info.description)}</p>
    <ul class="features">${info.features.map(feature => `<li>${escape(feature)}</li>`).join('')}</ul>
    <div class="actions"><a class="button" href="${escape(info.url)}">${escape(info.siteLabel)}</a><a class="source" href="${escape(project.repository)}">${escape(text.source)}</a></div>
    <p class="license">${escape(info.license)}</p>
  </div>
  <figure class="project-visual">
    <img src="${prefix}assets/${escape(project.image)}" width="1120" height="820" alt="${escape(info.imageAlt)}" fetchpriority="high">
    <figcaption>${escape(info.screenshotNote)}</figcaption>
  </figure>
</article>`;
}

function render(lang) {
  const text = languages[lang];
  const prefix = text.path ? '../' : './';
  const url = siteUrl + text.path;
  const languageLinks = Object.entries(languages).map(([code, info]) => code === lang
    ? `<span lang="${code}" aria-current="page">${info.name}</span>`
    : `<a lang="${code}" hreflang="${code}" rel="alternate" href="${prefix}${info.path}">${info.name}</a>`).join('');
  const metadata = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: text.title, description: text.description, url, inLanguage: lang,
    author: { '@type': 'Person', name: 'TrooSlash', url: 'https://github.com/TrooSlash' },
    mainEntity: { '@type': 'ItemList', itemListElement: projects.map((project, index) => ({
      '@type': 'ListItem', position: index + 1, name: project.name, url: project[lang].url,
    })) },
  };
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(text.title)}</title>
<meta name="description" content="${escape(text.description)}">
<meta name="theme-color" content="#faf9f7">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
${alternates}
<link rel="alternate" hreflang="x-default" href="${siteUrl}">
<link rel="sitemap" type="application/xml" href="${siteUrl}sitemap.xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TrooSlash">
<meta property="og:title" content="${escape(text.title)}">
<meta property="og:description" content="${escape(text.description)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${text.locale}">
<meta property="og:locale:alternate" content="${languages[lang === 'en' ? 'ru' : 'en'].locale}">
<meta property="og:image" content="${siteUrl}assets/dokvi-editor.png">
<meta property="og:image:width" content="1120">
<meta property="og:image:height" content="820">
<meta property="og:image:alt" content="${escape(projects[0][lang].imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${prefix}assets/style.css?v=${styleVersion}">
<script type="application/ld+json">${JSON.stringify(metadata).replaceAll('<', '\\u003c')}</script>
</head>
<body>
<a class="skip" href="#projects">${escape(text.skip)}</a>
<header class="header wrap">
  <span class="brand">TrooSlash<span class="slash" aria-hidden="true">/</span></span>
  <nav class="nav" aria-label="${escape(text.navigation)}">
    <a href="https://github.com/TrooSlash">GitHub</a>
    <div class="languages" role="group" aria-label="${escape(text.language)}">${languageLinks}</div>
  </nav>
</header>
<main class="wrap" id="projects" tabindex="-1">
  <div class="intro"><h1>${escape(text.heading)}</h1><p>${escape(text.intro)}</p></div>
  <div class="projects">${projects.map(project => renderProject(project, lang, prefix)).join('\n')}</div>
</main>
<footer class="footer wrap"><p>${escape(text.byline)}</p><a href="${repository}">${escape(text.siteSource)}</a></footer>
</body>
</html>
`;
}

await mkdir(join(output, 'assets'), { recursive: true });
await writeFile(join(output, 'assets/style.css'), stylesheet);
for (const filename of await readdir(join(root, 'site/assets'))) {
  await copyFile(join(root, 'site/assets', filename), join(output, 'assets', filename));
}
for (const [lang, text] of Object.entries(languages)) {
  await mkdir(join(output, text.path), { recursive: true });
  await writeFile(join(output, text.path, 'index.html'), render(lang));
}
for (const filename of ['.nojekyll', 'robots.txt', 'yandex_dd53558655046ac4.html']) {
  await copyFile(join(root, filename), join(output, filename));
}
const urls = Object.values(languages).map(text => `<url><loc>${siteUrl}${text.path}</loc></url>`).join('\n');
await writeFile(join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log(`Built English and Russian project pages in ${output}`);
