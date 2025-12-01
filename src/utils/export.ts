export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) {
        return;
    }

    // Obter cabeçalhos
    const headers = Object.keys(data[0]);

    // Converter para CSV
    const csvContent = [
        headers.join(','), // Cabeçalho
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Tratar strings com vírgulas ou aspas
                if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    // Criar Blob e link de download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
