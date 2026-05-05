export function getGradient(source: string): string {
  const gradients: Record<string, string> = {
    'jobberman': 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    'remoteok': 'linear-gradient(135deg, #1a1a2e, #16213e)',
    'weworkremotely': 'linear-gradient(135deg, #0f2027, #203a43)',
    'googlenews-jobs': 'linear-gradient(135deg, #134e4a, #0d9488)',
    'scholarshipregion': 'linear-gradient(135deg, #1e1b4b, #4338ca)',
    'scholars4dev': 'linear-gradient(135deg, #3b0764, #7c3aed)',
    'opportunitydesk': 'linear-gradient(135deg, #064e3b, #059669)',
    'afterschoolafrica': 'linear-gradient(135deg, #7c2d12, #ea580c)',
    'googlenews': 'linear-gradient(135deg, #14532d, #16a34a)',
  }
  return gradients[source] || 'linear-gradient(135deg, #1f2937, #374151)'
}
