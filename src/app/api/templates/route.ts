import { NextRequest, NextResponse } from 'next/server';
import { listTemplates, TEMPLATES } from '@/lib/templates/templateSystem';

// List all templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get specific template
      const template = TEMPLATES[id];
      if (!template) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: template,
      });
    }

    // List all templates
    const templates = listTemplates();
    return NextResponse.json({
      success: true,
      data: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        documentTypes: t.documentTypes,
        fieldCount: t.fields.length,
      })),
    });
  } catch (error) {
    console.error('List templates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}
