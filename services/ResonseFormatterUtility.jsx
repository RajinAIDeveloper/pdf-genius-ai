class ResponseFormatter {
    static formatResponse(text) {
        let formatted = text;
        formatted = this.preProcess(formatted);
        formatted = this.formatHeadings(formatted);
        formatted = this.formatSections(formatted);
        formatted = this.formatLists(formatted);
        formatted = this.formatSpecialSections(formatted);
        formatted = this.cleanupFormatting(formatted);
        return formatted;
    }

    static preProcess(text) {
        let processed = text;
        
        // Remove decorative lines
        processed = processed.replace(/^[=_\-─═]{2,}$/gm, '');
        
        // Fix misplaced heading markers and text
        processed = processed.replace(/(\w)#+\s/g, '$1\n\n# ');
        processed = processed.replace(/(\w)\s+#/g, '$1\n\n#');
        
        // Ensure all headings start on new lines
        processed = processed.replace(/([^\n])#/g, '$1\n\n#');
        
        // Fix spacing around hash symbols
        processed = processed.replace(/#+\s+/g, match => match.trim() + ' ');
        
        // Handle various bullet point styles
        processed = processed.replace(/(?<=\n\s*)[-—•●♦]\s+/g, '• ');
        
        // Convert numbered lists at start of lines
        processed = processed.replace(/^(\d+)\.\s+/gm, '$1. ');
        
        // Fix broken words across lines
        processed = processed.replace(/(\w)\s*\n\s*(\w)/g, '$1$2');
        
        // Handle blockquotes
        processed = processed.replace(/^>\s*/gm, '> ');
        
        return processed;
    }

    static formatHeadings(text) {
        let formatted = text;

        // Format main (level 1) headings
        formatted = formatted.replace(/^#\s+([^\n]+)/gm, (_, title) => {
            return `\n# ${title.trim().toUpperCase()}\n\n`;
        });

        // Format subheadings (level 2+)
        formatted = formatted.replace(/\n#+\s+([^\n]+)/g, (match, title) => {
            return `\n\n## ${title.trim()}\n\n`;
        });

        // Format sub-subheadings (level 3)
        formatted = formatted.replace(/\n###\s+([^\n]+)/g, (match, title) => {
            return `\n\n### ${title.trim()}\n\n`;
        });

        return formatted;
    }

    static formatSections(text) {
        let formatted = text;
        
        // Split content into sections
        const sections = formatted.split(/(?=\n#+\s)/);
        
        // Process each section
        formatted = sections.map(section => {
            // Handle top-level bullet points
            section = section.replace(/^•\s+([^\n•]+)/gm, '• $1');
            
            // Handle sub-level bullet points
            section = section.replace(/^(\s+)•\s+([^\n•]+)/gm, '  - $2');
            
            // Add proper spacing between items
            section = section.replace(/([^.\n])\s+(?=[A-Z])/g, '$1.\n');
            
            return section;
        }).join('\n\n');

        return formatted;
    }

    static formatLists(text) {
        let formatted = text;

        // Format main bullet points
        formatted = formatted.replace(/^•\s+(.+)$/gm, (_, content) => {
            return `• ${content.trim()}`;
        });
        
        // Format sub-items
        formatted = formatted.replace(/^(\s+)-\s+(.+)$/gm, (_, indent, content) => {
            return `  - ${content.trim()}`;
        });
        
        // Format numbered lists
        formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, (_, number, content) => {
            return `${number}. ${content.trim()}`;
        });
        
        // Add spacing after list items
        formatted = formatted.replace(/([-•]\s[^\n]+)(\n\s*[^-•\n])/g, '$1\n$2');

        return formatted;
    }

    static formatSpecialSections(text) {
        let formatted = text;
        
        // Format tips sections
        formatted = formatted.replace(/^📌\s*TIPS:$/gm, '\n📌 TIPS:\n');
        
        // Format summary sections
        formatted = formatted.replace(/^📍\s*SUMMARY:$/gm, '\n📍 SUMMARY:\n');
        
        // Format blockquotes
        formatted = formatted.replace(/^>\s+(.+)$/gm, (_, content) => {
            return `> ${content.trim()}`;
        });
        
        // Keep tables properly aligned
        formatted = formatted.replace(/^(│.+│)$/gm, match => match);
        
        // Format key points sections
        formatted = formatted.replace(/^Key Points:$/gm, '\nKey Points:\n');
        
        return formatted;
    }

    static cleanupFormatting(text) {
        let formatted = text;

        // Remove multiple consecutive blank lines
        formatted = formatted.replace(/\n{3,}/g, '\n\n');
        
        // Ensure proper sentence spacing
        formatted = formatted.replace(/([.!?])([A-Z])/g, '$1\n$2');
        
        // Clean up trailing spaces
        formatted = formatted.replace(/[ \t]+$/gm, '');
        
        // Proper spacing around blockquotes
        formatted = formatted.replace(/(^>.*$)/gm, '\n$1\n');
        
        // Fix spacing around special sections
        formatted = formatted.replace(/^(📌.*|📍.*)$/gm, '\n$1\n');
        
        // Ensure proper spacing between different types of content
        formatted = formatted.replace(/(\n[•-].*)\n(?=[A-Z])/g, '$1\n\n');
        
        // Ensure consistent final newline
        formatted = formatted.trim() + '\n';

        return formatted;
    }
}

export default ResponseFormatter;