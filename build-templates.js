// build-templates.js
// Template compiler engine for MailFooter

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, 'templates');

// Ensure root templates directory exists
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

// 1. Definition of the 5 Templates (schema and config grid)
const templatesDefinitions = [
  {
    id: 'executive-grid',
    name: 'Executive Grid',
    schema: {
      template_id: 'executive-grid',
      template_name: 'Executive Grid',
      editable_fields: [
        'logo', 'profile_image', 'full_name', 'designation', 'department', 'company',
        'phone', 'mobile', 'email', 'website', 'location', 'tagline', 'bio',
        'facebook', 'linkedin', 'instagram', 'twitter', 'youtube', 'banner_image',
        'cta_text', 'cta_url', 'brand_colour', 'legal_disclaimer'
      ]
    },
    config: {
      name: 'Executive Grid',
      rows: [
        {
          columns: [
            { width: 25, sections: ['logo'] },
            { width: 50, sections: ['tagline'] },
            { width: 25, sections: ['phone'] }
          ]
        },
        {
          columns: [
            { width: 25, sections: ['profile_image'] },
            { width: 35, sections: ['profile'] },
            { width: 25, sections: ['contacts'] },
            { width: 15, sections: ['cta_button'] }
          ]
        },
        {
          columns: [
            { width: 40, sections: ['socials'] },
            { width: 60, sections: ['banner'] }
          ]
        }
      ]
    }
  },
  {
    id: 'modern-sidebar',
    name: 'Modern Sidebar',
    schema: {
      template_id: 'modern-sidebar',
      template_name: 'Modern Sidebar',
      editable_fields: [
        'logo', 'profile_image', 'full_name', 'designation', 'department', 'company',
        'phone', 'mobile', 'email', 'website', 'location', 'tagline', 'bio',
        'facebook', 'linkedin', 'instagram', 'twitter', 'youtube', 'banner_image',
        'cta_text', 'cta_url', 'brand_colour', 'legal_disclaimer'
      ]
    },
    config: {
      name: 'Modern Sidebar',
      rows: [
        {
          columns: [
            { width: 100, sections: ['logo', 'tagline'] }
          ]
        },
        {
          columns: [
            { width: 30, sections: ['profile_image', 'socials'] },
            { width: 70, sections: ['profile', 'contacts'] }
          ]
        },
        {
          columns: [
            { width: 35, sections: ['cta_button'] },
            { width: 65, sections: ['banner'] }
          ]
        }
      ]
    }
  },
  {
    id: 'center-focus',
    name: 'Center Focus',
    schema: {
      template_id: 'center-focus',
      template_name: 'Center Focus',
      editable_fields: [
        'logo', 'profile_image', 'full_name', 'designation', 'department', 'company',
        'phone', 'mobile', 'email', 'website', 'location', 'tagline', 'bio',
        'facebook', 'linkedin', 'instagram', 'twitter', 'youtube', 'banner_image',
        'cta_text', 'cta_url', 'brand_colour', 'legal_disclaimer'
      ]
    },
    config: {
      name: 'Center Focus',
      rows: [
        {
          columns: [
            { width: 25, sections: ['logo'] },
            { width: 50, sections: ['tagline'] },
            { width: 25, sections: ['phone'] }
          ]
        },
        {
          columns: [
            { width: 100, sections: ['profile_image', 'profile_centered', 'contacts_centered'] }
          ]
        },
        {
          columns: [
            { width: 35, sections: ['socials_centered'] },
            { width: 30, sections: ['cta_button_centered'] },
            { width: 35, sections: ['website_centered'] }
          ]
        }
      ]
    }
  },
  {
    id: 'split-contact',
    name: 'Split Contact',
    schema: {
      template_id: 'split-contact',
      template_name: 'Split Contact',
      editable_fields: [
        'logo', 'profile_image', 'full_name', 'designation', 'department', 'company',
        'phone', 'mobile', 'email', 'website', 'location', 'tagline', 'bio',
        'facebook', 'linkedin', 'instagram', 'twitter', 'youtube', 'banner_image',
        'cta_text', 'cta_url', 'brand_colour', 'legal_disclaimer'
      ]
    },
    config: {
      name: 'Split Contact',
      rows: [
        {
          columns: [
            { width: 25, sections: ['logo'] },
            { width: 75, sections: ['profile'] }
          ]
        },
        {
          columns: [
            { width: 25, sections: ['email_block'] },
            { width: 25, sections: ['phone_block'] },
            { width: 25, sections: ['website_block'] },
            { width: 25, sections: ['location_block'] }
          ]
        },
        {
          columns: [
            { width: 100, sections: ['banner'] }
          ]
        },
        {
          columns: [
            { width: 100, sections: ['socials'] }
          ]
        }
      ]
    }
  },
  {
    id: 'brand-showcase',
    name: 'Brand Showcase',
    schema: {
      template_id: 'brand-showcase',
      template_name: 'Brand Showcase',
      editable_fields: [
        'logo', 'profile_image', 'full_name', 'designation', 'department', 'company',
        'phone', 'mobile', 'email', 'website', 'location', 'tagline', 'bio',
        'facebook', 'linkedin', 'instagram', 'twitter', 'youtube', 'banner_image',
        'cta_text', 'cta_url', 'brand_colour', 'legal_disclaimer'
      ]
    },
    config: {
      name: 'Brand Showcase',
      rows: [
        {
          columns: [
            { width: 25, sections: ['logo'] },
            { width: 50, sections: ['tagline'] },
            { width: 25, sections: ['phone'] }
          ]
        },
        {
          columns: [
            { width: 100, sections: ['banner', 'profile', 'contacts'] }
          ]
        },
        {
          columns: [
            { width: 30, sections: ['socials'] },
            { width: 40, sections: ['tagline_small'] },
            { width: 30, sections: ['cta_button'] }
          ]
        }
      ]
    }
  }
];

// Helper to generate HTML fragment for a section
function getSectionHtml(sectionName) {
  switch (sectionName) {
    case 'logo':
      return `
      {% if logo %}
      <a href="{{website}}" target="_blank" style="text-decoration: none; display: block;">
        <img src="{{logo}}" alt="Logo" border="0" style="border: 0; display: block; max-width: 130px; height: auto;" />
      </a>
      {% endif %}
      `;
    case 'tagline':
      return `
      {% if tagline %}
      <div style="font-size: 13px; font-style: italic; color: #666666; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.4;">{{tagline}}</div>
      {% endif %}
      `;
    case 'tagline_small':
      return `
      {% if tagline %}
      <div style="font-size: 11px; font-style: italic; color: #888888; font-family: 'Segoe UI', Arial, sans-serif; text-align: center;">{{tagline}}</div>
      {% endif %}
      `;
    case 'phone':
      return `
      {% if phone %}
      <div style="font-size: 11px; font-family: 'Segoe UI', Arial, sans-serif; color: #555555; text-align: right;">
        <strong>Phone:</strong> {{phone}}
      </div>
      {% endif %}
      `;
    case 'profile_image':
      return `
      {% if profile_image %}
      <div style="line-height: 0; margin-bottom: 5px;">
        <img src="{{profile_image}}" alt="{{full_name}}" border="0" style="border: 0; display: block; width: 90px; height: 90px; border-radius: 50%; object-fit: cover;" />
      </div>
      {% endif %}
      `;
    case 'profile':
      return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; text-align: left;">
        <div style="font-size: 16px; font-weight: bold; color: {{brand_colour}}; margin: 0; line-height: 1.2;">{{full_name}}</div>
        <div style="font-size: 12px; color: #777777; font-weight: bold; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">{{designation}}{% if department %} &bull; {{department}}{% endif %}</div>
        {% if company %}<div style="font-size: 11px; color: #555555; font-weight: 600; margin-top: 1px;">{{company}}</div>{% endif %}
        {% if bio %}<div style="font-size: 11px; color: #666666; margin-top: 6px; line-height: 1.3;">{{bio}}</div>{% endif %}
      </div>
      `;
    case 'profile_centered':
      return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; text-align: center; margin-top: 10px;">
        <div style="font-size: 18px; font-weight: bold; color: {{brand_colour}}; margin: 0; line-height: 1.2;">{{full_name}}</div>
        <div style="font-size: 12px; color: #777777; font-weight: bold; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;">{{designation}}{% if department %} &bull; {{department}}{% endif %}</div>
        {% if company %}<div style="font-size: 11px; color: #555555; font-weight: 600; margin-top: 1px;">{{company}}</div>{% endif %}
        {% if bio %}<div style="font-size: 11px; color: #666666; margin-top: 8px; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.3;">{{bio}}</div>{% endif %}
      </div>
      `;
    case 'contacts':
      return `
      <table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #555555; line-height: 1.4;">
        {% if phone %}<tr><td style="padding-bottom: 2px; color: #555555; font-family: 'Segoe UI', Arial, sans-serif; white-space: nowrap;">📞 {{phone}}</td></tr>{% endif %}
        {% if mobile %}<tr><td style="padding-bottom: 2px; color: #555555; font-family: 'Segoe UI', Arial, sans-serif; white-space: nowrap;">📱 {{mobile}}</td></tr>{% endif %}
        {% if email %}<tr><td style="padding-bottom: 2px; color: #555555; font-family: 'Segoe UI', Arial, sans-serif; white-space: nowrap;">✉️ <a href="mailto:{{email}}" style="color: #333333; text-decoration: none; font-family: 'Segoe UI', Arial, sans-serif;">{{email}}</a></td></tr>{% endif %}
        {% if website %}<tr><td style="padding-bottom: 2px; color: #555555; font-family: 'Segoe UI', Arial, sans-serif; white-space: nowrap;">🌐 <a href="{{website}}" target="_blank" style="color: {{brand_colour}}; text-decoration: none; font-weight: 600; font-family: 'Segoe UI', Arial, sans-serif;">{{website}}</a></td></tr>{% endif %}
        {% if location %}<tr><td style="color: #555555; font-family: 'Segoe UI', Arial, sans-serif; white-space: nowrap;">📍 {{location}}</td></tr>{% endif %}
      </table>
      `;
    case 'contacts_centered':
      return `
      <table cellpadding="0" cellspacing="0" border="0" align="center" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #555555; margin-top: 10px;">
        <tr>
          <td style="text-align: center; line-height: 1.5;">
            {% if phone %}<span style="white-space: nowrap; margin: 0 6px;">📞 {{phone}}</span>{% endif %}
            {% if mobile %}<span style="white-space: nowrap; margin: 0 6px;">📱 {{mobile}}</span>{% endif %}
            {% if email %}<span style="white-space: nowrap; margin: 0 6px;">✉️ <a href="mailto:{{email}}" style="color: #333333; text-decoration: none;">{{email}}</a></span>{% endif %}
            {% if website %}<span style="white-space: nowrap; margin: 0 6px;">🌐 <a href="{{website}}" target="_blank" style="color: {{brand_colour}}; text-decoration: none; font-weight: 600;">{{website}}</a></span>{% endif %}
            {% if location %}<span style="white-space: nowrap; margin: 0 6px;">📍 {{location}}</span>{% endif %}
          </td>
        </tr>
      </table>
      `;
    case 'email_block':
      return `
      {% if email %}
      <div style="font-size: 11px; font-family: 'Segoe UI', Arial, sans-serif; color: #555555;">
        <div style="font-weight: bold; color: {{brand_colour}}; font-size: 9px; text-transform: uppercase;">Email</div>
        <div style="margin-top: 2px;"><a href="mailto:{{email}}" style="color: #333333; text-decoration: none;">{{email}}</a></div>
      </div>
      {% endif %}
      `;
    case 'phone_block':
      return `
      {% if phone %}
      <div style="font-size: 11px; font-family: 'Segoe UI', Arial, sans-serif; color: #555555;">
        <div style="font-weight: bold; color: {{brand_colour}}; font-size: 9px; text-transform: uppercase;">Phone</div>
        <div style="margin-top: 2px;">{{phone}}</div>
      </div>
      {% endif %}
      `;
    case 'website_block':
      return `
      {% if website %}
      <div style="font-size: 11px; font-family: 'Segoe UI', Arial, sans-serif; color: #555555;">
        <div style="font-weight: bold; color: {{brand_colour}}; font-size: 9px; text-transform: uppercase;">Website</div>
        <div style="margin-top: 2px;"><a href="{{website}}" target="_blank" style="color: #333333; text-decoration: none;">{{website}}</a></div>
      </div>
      {% endif %}
      `;
    case 'location_block':
      return `
      {% if location %}
      <div style="font-size: 11px; font-family: 'Segoe UI', Arial, sans-serif; color: #555555;">
        <div style="font-weight: bold; color: {{brand_colour}}; font-size: 9px; text-transform: uppercase;">Location</div>
        <div style="margin-top: 2px;">{{location}}</div>
      </div>
      {% endif %}
      `;
    case 'cta_button':
      return `
      {% if cta_text and cta_url %}
      <div style="margin-top: 5px;">
        <a href="{{cta_url}}" target="_blank" style="text-decoration: none; display: inline-block; background-color: {{brand_colour}}; color: #ffffff; padding: 6px 12px; font-size: 11px; font-weight: bold; border-radius: 4px; font-family: 'Segoe UI', Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">{{cta_text}}</a>
      </div>
      {% endif %}
      `;
    case 'cta_button_centered':
      return `
      {% if cta_text and cta_url %}
      <div style="margin-top: 5px; text-align: center;">
        <a href="{{cta_url}}" target="_blank" style="text-decoration: none; display: inline-block; background-color: {{brand_colour}}; color: #ffffff; padding: 6px 12px; font-size: 11px; font-weight: bold; border-radius: 4px; font-family: 'Segoe UI', Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">{{cta_text}}</a>
      </div>
      {% endif %}
      `;
    case 'website_centered':
      return `
      {% if website %}
      <div style="font-size: 11px; font-family: 'Segoe UI', Arial, sans-serif; text-align: right; line-height: 24px;">
        <a href="{{website}}" target="_blank" style="color: {{brand_colour}}; text-decoration: none; font-weight: bold;">{{website}}</a>
      </div>
      {% endif %}
      `;
    case 'socials':
      return `
      <table cellpadding="0" cellspacing="0" border="0" style="display: inline-block; font-family: 'Segoe UI', Arial, sans-serif;">
        <tr>
          {% if linkedin %}<td style="padding-right: 8px; line-height: 0;"><a href="{{linkedin}}" target="_blank" style="text-decoration: none;"><img src="https://img.icons8.com/ios-glyphs/22/{{brand_colour_hex}}/linkedin.png" width="22" height="22" style="border: 0; display: block; width: 22px; height: 22px;" /></a></td>{% endif %}
          {% if facebook %}<td style="padding-right: 8px; line-height: 0;"><a href="{{facebook}}" target="_blank" style="text-decoration: none;"><img src="https://img.icons8.com/ios-glyphs/22/{{brand_colour_hex}}/facebook-new.png" width="22" height="22" style="border: 0; display: block; width: 22px; height: 22px;" /></a></td>{% endif %}
          {% if instagram %}<td style="padding-right: 8px; line-height: 0;"><a href="{{instagram}}" target="_blank" style="text-decoration: none;"><img src="https://img.icons8.com/ios-glyphs/22/{{brand_colour_hex}}/instagram-new.png" width="22" height="22" style="border: 0; display: block; width: 22px; height: 22px;" /></a></td>{% endif %}
          {% if twitter %}<td style="padding-right: 8px; line-height: 0;"><a href="{{twitter}}" target="_blank" style="text-decoration: none;"><img src="https://img.icons8.com/ios-glyphs/22/{{brand_colour_hex}}/x.png" width="22" height="22" style="border: 0; display: block; width: 22px; height: 22px;" /></a></td>{% endif %}
          {% if youtube %}<td style="padding-right: 8px; line-height: 0;"><a href="{{youtube}}" target="_blank" style="text-decoration: none;"><img src="https://img.icons8.com/ios-glyphs/22/{{brand_colour_hex}}/youtube-play.png" width="22" height="22" style="border: 0; display: block; width: 22px; height: 22px;" /></a></td>{% endif %}
        </tr>
      </table>
      `;
    case 'socials_centered':
      return `
      <table cellpadding="0" cellspacing="0" border="0" style="display: inline-block; font-family: 'Segoe UI', Arial, sans-serif;">
        <tr>
          {% if linkedin %}<td style="padding: 0 4px; line-height: 0;"><a href="{{linkedin}}" target="_blank" style="text-decoration: none;"><img src="https://img.icons8.com/ios-glyphs/22/{{brand_colour_hex}}/linkedin.png" width="22" height="22" style="border: 0; display: block; width: 22px; height: 22px;" /></a></td>{% endif %}
          {% if facebook %}<td style="padding: 0 4px; line-height: 0;"><a href="{{facebook}}" target="_blank" style="text-decoration: none;"><img src="https://img.icons8.com/ios-glyphs/22/{{brand_colour_hex}}/facebook-new.png" width="22" height="22" style="border: 0; display: block; width: 22px; height: 22px;" /></a></td>{% endif %}
          {% if instagram %}<td style="padding: 0 4px; line-height: 0;"><a href="{{instagram}}" target="_blank" style="text-decoration: none;"><img src="https://img.icons8.com/ios-glyphs/22/{{brand_colour_hex}}/instagram-new.png" width="22" height="22" style="border: 0; display: block; width: 22px; height: 22px;" /></a></td>{% endif %}
          {% if twitter %}<td style="padding: 0 4px; line-height: 0;"><a href="{{twitter}}" target="_blank" style="text-decoration: none;"><img src="https://img.icons8.com/ios-glyphs/22/{{brand_colour_hex}}/x.png" width="22" height="22" style="border: 0; display: block; width: 22px; height: 22px;" /></a></td>{% endif %}
          {% if youtube %}<td style="padding: 0 4px; line-height: 0;"><a href="{{youtube}}" target="_blank" style="text-decoration: none;"><img src="https://img.icons8.com/ios-glyphs/22/{{brand_colour_hex}}/youtube-play.png" width="22" height="22" style="border: 0; display: block; width: 22px; height: 22px;" /></a></td>{% endif %}
        </tr>
      </table>
      `;
    case 'banner':
      return `
      {% if banner_image %}
      <div style="line-height: 0; margin-top: 5px;">
        <img src="{{banner_image}}" alt="Banner" border="0" style="border: 0; display: block; width: 100%; height: auto; max-width: 100%; border-radius: 4px;" />
      </div>
      {% endif %}
      `;
    case 'cta':
      return `
      {% if banner_image %}
      <div style="line-height: 0; margin-top: 5px;">
        <a href="{{cta_url}}" target="_blank" style="text-decoration: none; display: block;">
          <img src="{{banner_image}}" alt="CTA Banner" border="0" style="border: 0; display: block; width: 100%; height: auto; max-width: 100%; border-radius: 4px;" />
        </a>
      </div>
      {% endif %}
      `;
    default:
      return '&nbsp;';
  }
}

// Function to generate the template.html based on rows/columns config
function compileTemplateHtml(id, name, config) {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    /* Mobile responsive override */
    @media only screen and (max-width: 599px) {
      .mf-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .col-stack {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">

  <!-- Outer wrapper table for width constraint -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; width: 100%; border-collapse: collapse;">
    <tr>
      <td align="left" valign="top" style="padding: 10px 0;">
        
        <!-- Main signature grid container -->
        <table class="mf-container" cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 700px; background-color: #ffffff; font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif; border: 1px solid #e5e7eb; border-radius: 8px; border-collapse: separate; overflow: hidden; border-spacing: 0;">
  `;

  config.rows.forEach((row, rowIndex) => {
    html += `          <!-- ROW ${rowIndex + 1} -->\n          <tr>\n`;

    row.columns.forEach((col) => {
      const width = col.width;
      
      // Determine conditional wrapper around cell if cell contents are entirely optional
      let cellCondStart = '';
      let cellCondEnd = '';
      
      if (col.sections.length === 1) {
        const singleSec = col.sections[0];
        if (['logo', 'profile_image', 'tagline', 'phone', 'banner', 'cta', 'cta_button'].includes(singleSec)) {
          let checkVar = singleSec;
          if (singleSec === 'banner' || singleSec === 'cta') checkVar = 'banner_image';
          if (singleSec === 'cta_button') checkVar = 'cta_text';
          cellCondStart = `{% if ${checkVar} %}`;
          cellCondEnd = `{% endif %}`;
        }
      }
      
      html += `            ${cellCondStart}<td class="col-stack" valign="top" width="${width}%" style="width: ${width}%; padding: 15px; text-align: left; vertical-align: top; border-spacing: 0;">\n`;
      
      col.sections.forEach((section) => {
        html += `              <!-- SECTION: ${section} -->\n`;
        html += getSectionHtml(section).trim().split('\n').map(line => '              ' + line).join('\n') + '\n';
      });
      
      html += `            </td>${cellCondEnd}\n`;
    });

    html += `          </tr>\n`;
  });

  html += `        </table>

        <!-- Legal Disclaimer Section -->
        {% if legal_disclaimer %}
        <table class="mf-container" cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 700px; margin-top: 10px; font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 10px; font-size: 9px; color: #999999; line-height: 1.3; text-align: left;">
              {{legal_disclaimer}}
            </td>
          </tr>
        </table>
        {% endif %}

      </td>
    </tr>
  </table>

</body>
</html>
`;

  return html;
}

// Compile all defined templates
templatesDefinitions.forEach((def) => {
  const folderPath = path.join(TEMPLATES_DIR, def.id);
  
  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Write schema.json
  const schemaPath = path.join(folderPath, 'schema.json');
  fs.writeFileSync(schemaPath, JSON.stringify(def.schema, null, 2), 'utf8');

  // Write config.json
  const configPath = path.join(folderPath, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(def.config, null, 2), 'utf8');

  // Compile and write template.html
  const templateHtmlContent = compileTemplateHtml(def.id, def.name, def.config);
  const templateHtmlPath = path.join(folderPath, 'template.html');
  fs.writeFileSync(templateHtmlPath, templateHtmlContent, 'utf8');

  console.log(`Compiled Template: ${def.name} -> ${folderPath}`);
});

console.log('All email signature templates compiled successfully!');
