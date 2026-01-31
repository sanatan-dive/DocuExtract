/**
 * Template System for Document Type-Specific Extraction
 * 
 * This module provides specialized extraction prompts for different document types,
 * improving accuracy by tailoring the AI instructions to the expected content.
 */

export interface ExtractionTemplate {
  id: string;
  name: string;
  description: string;
  documentTypes: string[]; // e.g., ['invoice', 'receipt', 'form']
  fields: TemplateField[];
  prompt: string;
}

export interface TemplateField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  validation?: string; // regex or validation rule
  enumValues?: string[];
}

// Default templates for common document types
export const TEMPLATES: Record<string, ExtractionTemplate> = {
  // German Registration Form (Anmeldung)
  registration_form: {
    id: 'registration_form',
    name: 'Registration Form (Anmeldung)',
    description: 'German residence registration forms',
    documentTypes: ['FORM', 'HANDWRITTEN', 'MIXED'],
    fields: [
      { name: 'name', type: 'string', required: true },
      { name: 'address', type: 'string', required: true },
      { name: 'postalcode', type: 'string', required: true, validation: '^\\d{5}$' },
      { name: 'city', type: 'string', required: true },
      { name: 'birthday', type: 'date', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'time', type: 'string', required: false },
      { name: 'handwritten', type: 'boolean', required: true },
      { name: 'signed', type: 'boolean', required: true },
      { name: 'stamp', type: 'enum', required: false, enumValues: ['BB', 'AB', 'FK', 'S'] },
    ],
    prompt: `You are extracting data from a German residence registration form (Anmeldung).

Extract the following fields with high precision:
- name: Full name (Vor- und Nachname)
- address: Street address (Straße und Hausnummer)
- postalcode: German postal code (5 digits, PLZ)
- city: City name (Ort)
- birthday: Date of birth in DD.MM.YYYY format
- date: Form date in DD.MM.YYYY format
- time: Time if present in HH:MM format
- handwritten: true if the form is handwritten, false if typed
- signed: true if there is a signature
- stamp: Office stamp code if visible (BB, AB, FK, S)

Pay special attention to:
- German umlauts (ä, ö, ü, ß)
- Date formats (DD.MM.YYYY)
- Postal codes must be exactly 5 digits

Return JSON with confidence_scores (0-1) for each field.`,
  },

  // Invoice Template
  invoice: {
    id: 'invoice',
    name: 'Invoice (Rechnung)',
    description: 'Business invoices and bills',
    documentTypes: ['TYPED', 'SCANNED'],
    fields: [
      { name: 'invoice_number', type: 'string', required: true },
      { name: 'vendor_name', type: 'string', required: true },
      { name: 'vendor_address', type: 'string', required: false },
      { name: 'customer_name', type: 'string', required: true },
      { name: 'date', type: 'date', required: true },
      { name: 'due_date', type: 'date', required: false },
      { name: 'total_amount', type: 'number', required: true },
      { name: 'tax_amount', type: 'number', required: false },
      { name: 'currency', type: 'string', required: true },
    ],
    prompt: `You are extracting data from a business invoice.

Extract the following fields:
- invoice_number: Invoice/Reference number
- vendor_name: Company issuing the invoice
- vendor_address: Vendor's address
- customer_name: Customer/recipient name
- date: Invoice date in DD.MM.YYYY format
- due_date: Payment due date
- total_amount: Total amount (number only)
- tax_amount: VAT/Tax amount if shown
- currency: Currency code (EUR, USD, etc.)

Return JSON with confidence_scores (0-1) for each field.`,
  },

  // Contract Template
  contract: {
    id: 'contract',
    name: 'Contract (Vertrag)',
    description: 'Legal contracts and agreements',
    documentTypes: ['TYPED', 'MIXED'],
    fields: [
      { name: 'contract_type', type: 'string', required: true },
      { name: 'party_a', type: 'string', required: true },
      { name: 'party_b', type: 'string', required: true },
      { name: 'effective_date', type: 'date', required: true },
      { name: 'expiry_date', type: 'date', required: false },
      { name: 'signed', type: 'boolean', required: true },
      { name: 'notarized', type: 'boolean', required: false },
    ],
    prompt: `You are extracting data from a legal contract or agreement.

Extract the following fields:
- contract_type: Type of contract (e.g., "Mietvertrag", "Arbeitsvertrag")
- party_a: First party name (usually the issuer)
- party_b: Second party name (usually the recipient)
- effective_date: Contract start date
- expiry_date: Contract end date if specified
- signed: true if signatures are present
- notarized: true if notary stamp/seal is visible

Return JSON with confidence_scores (0-1) for each field.`,
  },

  // Generic Document (fallback)
  generic: {
    id: 'generic',
    name: 'Generic Document',
    description: 'Fallback for unclassified documents',
    documentTypes: ['HANDWRITTEN', 'TYPED', 'MIXED', 'SCANNED'],
    fields: [
      { name: 'title', type: 'string', required: false },
      { name: 'date', type: 'date', required: false },
      { name: 'primary_text', type: 'string', required: false },
      { name: 'names_mentioned', type: 'string', required: false },
      { name: 'handwritten', type: 'boolean', required: true },
    ],
    prompt: `Extract any structured data you can find from this document.

Look for:
- title: Document title or heading
- date: Any dates mentioned
- primary_text: Main content summary
- names_mentioned: Any person or company names
- handwritten: true if handwritten content is present

Return JSON with confidence_scores (0-1) for each field.`,
  },
};

/**
 * Get the best matching template for a document type
 */
export function getTemplateForDocumentType(
  docType: string,
  templateId?: string
): ExtractionTemplate {
  // If specific template requested, return it
  if (templateId && TEMPLATES[templateId]) {
    return TEMPLATES[templateId];
  }

  // Find best match based on document type
  for (const template of Object.values(TEMPLATES)) {
    if (template.id !== 'generic' && template.documentTypes.includes(docType)) {
      return template;
    }
  }

  // Fallback to generic
  return TEMPLATES.generic;
}

/**
 * List all available templates
 */
export function listTemplates(): ExtractionTemplate[] {
  return Object.values(TEMPLATES);
}

/**
 * Register a custom template
 */
export function registerTemplate(template: ExtractionTemplate): void {
  TEMPLATES[template.id] = template;
}

/**
 * Build extraction prompt from template
 */
export function buildPromptFromTemplate(template: ExtractionTemplate): string {
  const fieldList = template.fields
    .map(f => `- ${f.name}: ${f.type}${f.required ? ' (required)' : ''}`)
    .join('\n');

  return `${template.prompt}

Expected fields:
${fieldList}

Respond with valid JSON only.`;
}
