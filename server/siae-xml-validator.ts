/**
 * SIAE XML Validator - Validates XML against official SIAE DTD specifications
 * Based on official SIAE PHP library DTD files v0039
 */

interface ValidationError {
  code: string;
  message: string;
  element?: string;
  expected?: string;
  found?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// DTD Element definitions extracted from official SIAE DTD files
const DTD_DEFINITIONS = {
  // RiepilogoGiornaliero (RMG) - Daily Report
  RiepilogoGiornaliero: {
    attributes: {
      required: ['Sostituzione', 'Data', 'DataGenerazione', 'OraGenerazione', 'ProgressivoGenerazione'],
      optional: [],
      values: {
        Sostituzione: ['N', 'S']
      }
    },
    children: {
      required: ['Titolare'],
      optional: ['Organizzatore'],
      order: ['Titolare', 'Organizzatore']
    }
  },

  // RiepilogoMensile (RPM) - Monthly Report  
  RiepilogoMensile: {
    attributes: {
      required: ['Sostituzione', 'Mese', 'DataGenerazione', 'OraGenerazione', 'ProgressivoGenerazione'],
      optional: [],
      values: {
        Sostituzione: ['N', 'S']
      }
    },
    children: {
      required: ['Titolare'],
      optional: ['Organizzatore'],
      order: ['Titolare', 'Organizzatore']
    }
  },

  // RiepilogoControlloAccessi (RCA) - Access Control Summary
  RiepilogoControlloAccessi: {
    attributes: {
      required: ['Sostituzione'],
      optional: [],
      values: {
        Sostituzione: ['N', 'S']
      }
    },
    children: {
      required: ['Titolare', 'Evento'],
      optional: [],
      order: ['Titolare', 'Evento']
    }
  },

  // Common elements
  Titolare: {
    children: {
      required: ['Denominazione', 'CodiceFiscale', 'SistemaEmissione'],
      optional: [],
      order: ['Denominazione', 'CodiceFiscale', 'SistemaEmissione']
    }
  },

  // RCA-specific Titolare (different structure)
  TitolareCA: {
    children: {
      required: ['DenominazioneTitolareCA', 'CFTitolareCA', 'CodiceSistemaCA', 'DataRiepilogo', 'DataGenerazioneRiepilogo', 'OraGenerazioneRiepilogo', 'ProgressivoRiepilogo'],
      optional: [],
      order: ['DenominazioneTitolareCA', 'CFTitolareCA', 'CodiceSistemaCA', 'DataRiepilogo', 'DataGenerazioneRiepilogo', 'OraGenerazioneRiepilogo', 'ProgressivoRiepilogo']
    }
  },

  Organizzatore: {
    children: {
      required: ['Denominazione', 'CodiceFiscale', 'TipoOrganizzatore'],
      optional: ['Evento', 'Abbonamenti', 'AltriProventiGenerici'],
      order: ['Denominazione', 'CodiceFiscale', 'TipoOrganizzatore', 'Evento', 'Abbonamenti', 'AltriProventiGenerici']
    }
  },

  TipoOrganizzatore: {
    attributes: {
      required: ['valore'],
      optional: [],
      values: {
        valore: ['E', 'P', 'G']
      }
    },
    empty: true
  },

  Evento: {
    children: {
      required: ['Intrattenimento', 'Locale', 'DataEvento', 'OraEvento', 'MultiGenere', 'OrdineDiPosto'],
      optional: ['AltriProventiEvento'],
      order: ['Intrattenimento', 'Locale', 'DataEvento', 'OraEvento', 'MultiGenere', 'OrdineDiPosto', 'AltriProventiEvento']
    }
  },

  // RCA-specific Evento (flat structure)
  EventoCA: {
    children: {
      required: ['CFOrganizzatore', 'DenominazioneOrganizzatore', 'TipologiaOrganizzatore', 'SpettacoloIntrattenimento', 'IncidenzaIntrattenimento', 'DenominazioneLocale', 'CodiceLocale', 'DataEvento', 'OraEvento', 'TipoGenere', 'TitoloEvento', 'Autore', 'Esecutore', 'NazionalitaFilm', 'NumOpereRappresentate', 'SistemaEmissione'],
      optional: [],
      order: ['CFOrganizzatore', 'DenominazioneOrganizzatore', 'TipologiaOrganizzatore', 'SpettacoloIntrattenimento', 'IncidenzaIntrattenimento', 'DenominazioneLocale', 'CodiceLocale', 'DataEvento', 'OraEvento', 'TipoGenere', 'TitoloEvento', 'Autore', 'Esecutore', 'NazionalitaFilm', 'NumOpereRappresentate', 'SistemaEmissione']
    }
  },

  Intrattenimento: {
    children: {
      required: ['TipoTassazione'],
      optional: ['Incidenza', 'ImponibileIntrattenimenti'], // ImponibileIntrattenimenti only for RPM
      order: ['TipoTassazione', 'Incidenza', 'ImponibileIntrattenimenti']
    }
  },

  TipoTassazione: {
    attributes: {
      required: ['valore'],
      optional: [],
      values: {
        valore: ['S', 'I']
      }
    },
    empty: true
  },

  Locale: {
    children: {
      required: ['Denominazione', 'CodiceLocale'],
      optional: [],
      order: ['Denominazione', 'CodiceLocale']
    }
  },

  MultiGenere: {
    children: {
      required: ['TipoGenere', 'IncidenzaGenere', 'TitoliOpere'],
      optional: [],
      order: ['TipoGenere', 'IncidenzaGenere', 'TitoliOpere']
    }
  },

  TitoliOpere: {
    children: {
      required: ['Titolo'],
      optional: ['ProduttoreCinema', 'Autore', 'Esecutore', 'Nazionalita', 'Distributore'],
      order: ['Titolo', 'ProduttoreCinema', 'Autore', 'Esecutore', 'Nazionalita', 'Distributore']
    }
  },

  // OrdineDiPosto for RMG (no IVAEccedenteOmaggi)
  OrdineDiPostoRMG: {
    children: {
      required: ['CodiceOrdine', 'Capienza'],
      optional: ['TitoliAccesso', 'TitoliAnnullati', 'TitoliAccessoIVAPreassolta', 'TitoliIVAPreassoltaAnnullati', 'BigliettiAbbonamento', 'BigliettiAbbonamentoAnnullati'],
      order: ['CodiceOrdine', 'Capienza', 'TitoliAccesso', 'TitoliAnnullati', 'TitoliAccessoIVAPreassolta', 'TitoliIVAPreassoltaAnnullati', 'BigliettiAbbonamento', 'BigliettiAbbonamentoAnnullati']
    }
  },

  // OrdineDiPosto for RPM (IVAEccedenteOmaggi required)
  OrdineDiPostoRPM: {
    children: {
      required: ['CodiceOrdine', 'Capienza', 'IVAEccedenteOmaggi'],
      optional: ['TitoliAccesso', 'TitoliAnnullati', 'TitoliAccessoIVAPreassolta', 'TitoliIVAPreassoltaAnnullati', 'BigliettiAbbonamento', 'BigliettiAbbonamentoAnnullati', 'AbbonamentiFissi'],
      order: ['CodiceOrdine', 'Capienza', 'IVAEccedenteOmaggi', 'TitoliAccesso', 'TitoliAnnullati', 'TitoliAccessoIVAPreassolta', 'TitoliIVAPreassoltaAnnullati', 'BigliettiAbbonamento', 'BigliettiAbbonamentoAnnullati', 'AbbonamentiFissi']
    }
  },

  TitoliAccesso: {
    children: {
      required: ['TipoTitolo', 'Quantita', 'CorrispettivoLordo', 'Prevendita', 'IVACorrispettivo', 'IVAPrevendita', 'ImportoPrestazione'],
      optional: [],
      order: ['TipoTitolo', 'Quantita', 'CorrispettivoLordo', 'Prevendita', 'IVACorrispettivo', 'IVAPrevendita', 'ImportoPrestazione']
    }
  },

  Turno: {
    attributes: {
      required: ['valore'],
      optional: [],
      values: {
        valore: ['F', 'L']
      }
    },
    empty: true
  },

  // RCA specific elements
  SistemaEmissione: {
    children: {
      required: ['CodiceSistemaEmissione'],
      optional: ['Titoli', 'Abbonamenti'],
      order: ['CodiceSistemaEmissione', 'Titoli', 'Abbonamenti']
    }
  },

  Titoli: {
    children: {
      required: ['CodiceOrdinePosto', 'Capienza', 'TotaleTipoTitolo'],
      optional: [],
      order: ['CodiceOrdinePosto', 'Capienza', 'TotaleTipoTitolo']
    }
  },

  TotaleTipoTitolo: {
    children: {
      required: ['TipoTitolo', 'TotaleTitoliLTA', 'TotaleTitoliNoAccessoTradiz', 'TotaleTitoliNoAccessoDigitali', 'TotaleTitoliAutomatizzatiTradiz', 'TotaleTitoliAutomatizzatiDigitali', 'TotaleTitoliManualiTradiz', 'TotaleTitoliManualiDigitali', 'TotaleTitoliAnnullatiTradiz', 'TotaleTitoliAnnullatiDigitali', 'TotaleTitoliDaspatiTradiz', 'TotaleTitoliDaspatiDigitali', 'TotaleTitoliRubatiTradiz', 'TotaleTitoliRubatiDigitali', 'TotaleTitoliBLTradiz', 'TotaleTitoliBLDigitali'],
      optional: [],
      order: ['TipoTitolo', 'TotaleTitoliLTA', 'TotaleTitoliNoAccessoTradiz', 'TotaleTitoliNoAccessoDigitali', 'TotaleTitoliAutomatizzatiTradiz', 'TotaleTitoliAutomatizzatiDigitali', 'TotaleTitoliManualiTradiz', 'TotaleTitoliManualiDigitali', 'TotaleTitoliAnnullatiTradiz', 'TotaleTitoliAnnullatiDigitali', 'TotaleTitoliDaspatiTradiz', 'TotaleTitoliDaspatiDigitali', 'TotaleTitoliRubatiTradiz', 'TotaleTitoliRubatiDigitali', 'TotaleTitoliBLTradiz', 'TotaleTitoliBLDigitali']
    }
  }
};

// Simple XML parser for validation
function parseXMLElement(xml: string): { tag: string; attributes: Record<string, string>; children: string[]; content: string } | null {
  const tagMatch = xml.match(/^<(\w+)([^>]*)>/);
  if (!tagMatch) return null;

  const tag = tagMatch[1];
  const attrString = tagMatch[2];
  
  // Parse attributes
  const attributes: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(attrString)) !== null) {
    attributes[attrMatch[1]] = attrMatch[2];
  }

  // Find children elements
  const children: string[] = [];
  const childRegex = /<(\w+)[\s>]/g;
  let childMatch;
  // Skip the root element itself
  let remaining = xml.substring(tagMatch[0].length);
  while ((childMatch = childRegex.exec(remaining)) !== null) {
    if (!children.includes(childMatch[1])) {
      children.push(childMatch[1]);
    }
  }

  return { tag, attributes, children, content: xml };
}

// Get all direct child element names from XML
function getDirectChildren(xml: string, parentTag: string): string[] {
  const children: string[] = [];
  
  // Find the content between opening and closing tags
  const openTag = `<${parentTag}`;
  const closeTag = `</${parentTag}>`;
  
  const startIdx = xml.indexOf(openTag);
  if (startIdx === -1) return children;
  
  const endOfOpenTag = xml.indexOf('>', startIdx);
  if (endOfOpenTag === -1) return children;
  
  const endIdx = xml.lastIndexOf(closeTag);
  if (endIdx === -1) return children;
  
  const content = xml.substring(endOfOpenTag + 1, endIdx);
  
  // Find all direct child tags (simplified - counts first level only)
  let depth = 0;
  let currentTag = '';
  let inTag = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (char === '<') {
      if (content[i + 1] === '/') {
        depth--;
      } else if (content[i + 1] !== '?' && content[i + 1] !== '!') {
        if (depth === 0) {
          inTag = true;
          currentTag = '';
        }
        depth++;
      }
    } else if (inTag && (char === ' ' || char === '>' || char === '/')) {
      if (currentTag && !children.includes(currentTag)) {
        children.push(currentTag);
      }
      inTag = false;
    } else if (inTag) {
      currentTag += char;
    }
  }
  
  return children;
}

// Check if element exists in XML
function hasElement(xml: string, elementName: string): boolean {
  const regex = new RegExp(`<${elementName}[\\s>]`);
  return regex.test(xml);
}

// Get attribute value from root element
function getRootAttribute(xml: string, attrName: string): string | null {
  const match = xml.match(new RegExp(`${attrName}="([^"]*)"`));
  return match ? match[1] : null;
}

// Get all attributes from root element
function getRootAttributes(xml: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  // Remove newlines for simpler matching
  const xmlClean = xml.replace(/[\r\n]+/g, ' ');
  
  // FIX 2026-01-20: Gestione DOCTYPE opzionale tra dichiarazione XML e root element
  // Pattern: <?xml...?> [<!DOCTYPE...>] <RootElement attrs>
  // Il DOCTYPE è ora obbligatorio per conformità SIAE Allegato C
  const rootMatch = xmlClean.match(/^<\?xml[^?]*\?>\s*(?:<!DOCTYPE[^>]*>)?\s*<(\w+)([^>]*)>/);
  
  if (!rootMatch) {
    // Fallback: cerca direttamente il root element senza dichiarazione XML
    const altMatch = xml.match(/<(Riepilogo\w+|LogTransazione)([^>]*)>/);
    if (altMatch) {
      const attrString = altMatch[2];
      const attrRegex = /(\w+)="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(attrString)) !== null) {
        attributes[match[1]] = match[2];
      }
    }
  } else {
    const attrString = rootMatch[2];
    const attrRegex = /(\w+)="([^"]*)"/g;
    let match;
    while ((match = attrRegex.exec(attrString)) !== null) {
      attributes[match[1]] = match[2];
    }
  }
  return attributes;
}

// Count occurrences of an element
function countElements(xml: string, elementName: string): number {
  const regex = new RegExp(`<${elementName}[\\s>]`, 'g');
  const matches = xml.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Validate RMG (RiepilogoGiornaliero) XML
 */
export function validateRMG(xml: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check root element
  if (!xml.includes('<RiepilogoGiornaliero')) {
    errors.push({
      code: 'INVALID_ROOT',
      message: 'Root element must be RiepilogoGiornaliero',
      expected: 'RiepilogoGiornaliero',
      found: 'Unknown'
    });
    return { valid: false, errors, warnings };
  }

  // Check required attributes
  const rootAttrs = getRootAttributes(xml);
  const requiredAttrs = ['Sostituzione', 'Data', 'DataGenerazione', 'OraGenerazione', 'ProgressivoGenerazione'];
  
  for (const attr of requiredAttrs) {
    if (!rootAttrs[attr]) {
      errors.push({
        code: 'MISSING_ATTRIBUTE',
        message: `Missing required attribute: ${attr}`,
        element: 'RiepilogoGiornaliero',
        expected: attr
      });
    }
  }

  // FIX 2026-01-19: Rimosso warning per NomeFile - ora non usiamo più questo attributo nell'XML
  // per conformità alla DTD ufficiale SIAE v0039

  // Validate Sostituzione value
  if (rootAttrs['Sostituzione'] && !['N', 'S'].includes(rootAttrs['Sostituzione'])) {
    errors.push({
      code: 'INVALID_ATTRIBUTE_VALUE',
      message: 'Sostituzione must be N or S',
      element: 'RiepilogoGiornaliero',
      expected: 'N or S',
      found: rootAttrs['Sostituzione']
    });
  }

  // Check Data format (YYYYMMDD)
  if (rootAttrs['Data'] && !/^\d{8}$/.test(rootAttrs['Data'])) {
    errors.push({
      code: 'INVALID_DATE_FORMAT',
      message: 'Data must be in YYYYMMDD format',
      element: 'RiepilogoGiornaliero',
      expected: 'YYYYMMDD',
      found: rootAttrs['Data']
    });
  }

  // Check required elements
  if (!hasElement(xml, 'Titolare')) {
    errors.push({
      code: 'MISSING_ELEMENT',
      message: 'Missing required element: Titolare',
      element: 'RiepilogoGiornaliero',
      expected: 'Titolare'
    });
  }

  // Check MultiGenere is present (required for events)
  if (hasElement(xml, 'Evento') && !hasElement(xml, 'MultiGenere')) {
    errors.push({
      code: 'MISSING_ELEMENT',
      message: 'MultiGenere is required for each Evento',
      element: 'Evento',
      expected: 'MultiGenere'
    });
  }

  // Check IVAEccedenteOmaggi should NOT be present in RMG
  if (hasElement(xml, 'IVAEccedenteOmaggi')) {
    errors.push({
      code: 'INVALID_ELEMENT',
      message: 'IVAEccedenteOmaggi should NOT be present in RiepilogoGiornaliero (only for RiepilogoMensile)',
      element: 'OrdineDiPosto',
      found: 'IVAEccedenteOmaggi'
    });
  }

  // Check Titolare structure
  if (hasElement(xml, 'Titolare')) {
    if (!hasElement(xml, 'Denominazione')) {
      errors.push({
        code: 'MISSING_ELEMENT',
        message: 'Missing Denominazione in Titolare',
        element: 'Titolare',
        expected: 'Denominazione'
      });
    }
    if (!hasElement(xml, 'CodiceFiscale')) {
      errors.push({
        code: 'MISSING_ELEMENT',
        message: 'Missing CodiceFiscale in Titolare',
        element: 'Titolare',
        expected: 'CodiceFiscale'
      });
    }
    if (!hasElement(xml, 'SistemaEmissione')) {
      errors.push({
        code: 'MISSING_ELEMENT',
        message: 'Missing SistemaEmissione in Titolare',
        element: 'Titolare',
        expected: 'SistemaEmissione'
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate RPM (RiepilogoMensile) XML
 */
export function validateRPM(xml: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check root element
  if (!xml.includes('<RiepilogoMensile')) {
    errors.push({
      code: 'INVALID_ROOT',
      message: 'Root element must be RiepilogoMensile',
      expected: 'RiepilogoMensile',
      found: 'Unknown'
    });
    return { valid: false, errors, warnings };
  }

  // Check required attributes
  const rootAttrs = getRootAttributes(xml);
  const requiredAttrs = ['Sostituzione', 'Mese', 'DataGenerazione', 'OraGenerazione', 'ProgressivoGenerazione'];
  
  for (const attr of requiredAttrs) {
    if (!rootAttrs[attr]) {
      errors.push({
        code: 'MISSING_ATTRIBUTE',
        message: `Missing required attribute: ${attr}`,
        element: 'RiepilogoMensile',
        expected: attr
      });
    }
  }

  // FIX 2026-01-19: Rimosso warning per NomeFile - ora non usiamo più questo attributo nell'XML
  // per conformità alla DTD ufficiale SIAE v0039

  // Validate Sostituzione value
  if (rootAttrs['Sostituzione'] && !['N', 'S'].includes(rootAttrs['Sostituzione'])) {
    errors.push({
      code: 'INVALID_ATTRIBUTE_VALUE',
      message: 'Sostituzione must be N or S',
      element: 'RiepilogoMensile',
      expected: 'N or S',
      found: rootAttrs['Sostituzione']
    });
  }

  // Check Mese format (YYYYMM)
  if (rootAttrs['Mese'] && !/^\d{6}$/.test(rootAttrs['Mese'])) {
    errors.push({
      code: 'INVALID_DATE_FORMAT',
      message: 'Mese must be in YYYYMM format',
      element: 'RiepilogoMensile',
      expected: 'YYYYMM',
      found: rootAttrs['Mese']
    });
  }

  // Check required elements
  if (!hasElement(xml, 'Titolare')) {
    errors.push({
      code: 'MISSING_ELEMENT',
      message: 'Missing required element: Titolare',
      element: 'RiepilogoMensile',
      expected: 'Titolare'
    });
  }

  // Check MultiGenere is present (required for events)
  if (hasElement(xml, 'Evento') && !hasElement(xml, 'MultiGenere')) {
    errors.push({
      code: 'MISSING_ELEMENT',
      message: 'MultiGenere is required for each Evento',
      element: 'Evento',
      expected: 'MultiGenere'
    });
  }

  // Check IVAEccedenteOmaggi MUST be present in RPM OrdineDiPosto
  if (hasElement(xml, 'OrdineDiPosto') && !hasElement(xml, 'IVAEccedenteOmaggi')) {
    errors.push({
      code: 'MISSING_ELEMENT',
      message: 'IVAEccedenteOmaggi is REQUIRED in OrdineDiPosto for RiepilogoMensile',
      element: 'OrdineDiPosto',
      expected: 'IVAEccedenteOmaggi'
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate RCA (RiepilogoControlloAccessi) XML
 */
export function validateRCA(xml: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check root element
  if (!xml.includes('<RiepilogoControlloAccessi')) {
    errors.push({
      code: 'INVALID_ROOT',
      message: 'Root element must be RiepilogoControlloAccessi',
      expected: 'RiepilogoControlloAccessi',
      found: 'Unknown'
    });
    return { valid: false, errors, warnings };
  }

  // Check required attributes
  const rootAttrs = getRootAttributes(xml);
  
  if (!rootAttrs['Sostituzione']) {
    errors.push({
      code: 'MISSING_ATTRIBUTE',
      message: 'Missing required attribute: Sostituzione',
      element: 'RiepilogoControlloAccessi',
      expected: 'Sostituzione'
    });
  }

  // Validate Sostituzione value
  if (rootAttrs['Sostituzione'] && !['N', 'S'].includes(rootAttrs['Sostituzione'])) {
    errors.push({
      code: 'INVALID_ATTRIBUTE_VALUE',
      message: 'Sostituzione must be N or S',
      element: 'RiepilogoControlloAccessi',
      expected: 'N or S',
      found: rootAttrs['Sostituzione']
    });
  }

  // Check required Titolare element with RCA-specific children
  if (!hasElement(xml, 'Titolare')) {
    errors.push({
      code: 'MISSING_ELEMENT',
      message: 'Missing required element: Titolare',
      element: 'RiepilogoControlloAccessi',
      expected: 'Titolare'
    });
  } else {
    // Check RCA-specific Titolare children
    const rcaTitolareElements = [
      'DenominazioneTitolareCA',
      'CFTitolareCA', 
      'CodiceSistemaCA',
      'DataRiepilogo',
      'DataGenerazioneRiepilogo',
      'OraGenerazioneRiepilogo',
      'ProgressivoRiepilogo'
    ];
    
    for (const elem of rcaTitolareElements) {
      if (!hasElement(xml, elem)) {
        errors.push({
          code: 'MISSING_ELEMENT',
          message: `Missing required element in Titolare: ${elem}`,
          element: 'Titolare',
          expected: elem
        });
      }
    }
  }

  // Check required Evento element
  if (!hasElement(xml, 'Evento')) {
    errors.push({
      code: 'MISSING_ELEMENT',
      message: 'At least one Evento is required',
      element: 'RiepilogoControlloAccessi',
      expected: 'Evento'
    });
  }

  // Check SistemaEmissione in Evento
  if (hasElement(xml, 'Evento') && !hasElement(xml, 'SistemaEmissione')) {
    errors.push({
      code: 'MISSING_ELEMENT',
      message: 'SistemaEmissione is required in Evento',
      element: 'Evento',
      expected: 'SistemaEmissione'
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Auto-detect report type and validate
 */
export function validateSiaeXML(xml: string): ValidationResult & { reportType: string } {
  // Detect report type
  if (xml.includes('<RiepilogoGiornaliero')) {
    return { ...validateRMG(xml), reportType: 'RMG' };
  } else if (xml.includes('<RiepilogoMensile')) {
    return { ...validateRPM(xml), reportType: 'RPM' };
  } else if (xml.includes('<RiepilogoControlloAccessi')) {
    return { ...validateRCA(xml), reportType: 'RCA' };
  } else {
    return {
      valid: false,
      errors: [{
        code: 'UNKNOWN_REPORT_TYPE',
        message: 'Unable to detect SIAE report type. Expected RiepilogoGiornaliero, RiepilogoMensile, or RiepilogoControlloAccessi',
        expected: 'RiepilogoGiornaliero | RiepilogoMensile | RiepilogoControlloAccessi'
      }],
      warnings: [],
      reportType: 'UNKNOWN'
    };
  }
}

/**
 * Format validation result for logging/display
 */
export function formatValidationResult(result: ValidationResult & { reportType?: string }): string {
  const lines: string[] = [];
  
  lines.push(`=== SIAE XML Validation Result ===`);
  lines.push(`Report Type: ${result.reportType || 'Unknown'}`);
  lines.push(`Valid: ${result.valid ? '✅ YES' : '❌ NO'}`);
  
  if (result.errors.length > 0) {
    lines.push(`\nErrors (${result.errors.length}):`);
    for (const error of result.errors) {
      lines.push(`  ❌ [${error.code}] ${error.message}`);
      if (error.element) lines.push(`     Element: ${error.element}`);
      if (error.expected) lines.push(`     Expected: ${error.expected}`);
      if (error.found) lines.push(`     Found: ${error.found}`);
    }
  }
  
  if (result.warnings.length > 0) {
    lines.push(`\nWarnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      lines.push(`  ⚠️ [${warning.code}] ${warning.message}`);
      if (warning.element) lines.push(`     Element: ${warning.element}`);
      if (warning.found) lines.push(`     Found: ${warning.found}`);
    }
  }
  
  return lines.join('\n');
}

export type { ValidationResult, ValidationError };
