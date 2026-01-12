import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface SmartTimeInputProps {
    value: string; // HH:mm (24h)
    format: '12h' | '24h';
    onChange: (value: string) => void;
    className?: string;
}

export function SmartTimeInput({ value, format, onChange, className }: SmartTimeInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    // Update display when value or format changes
    useEffect(() => {
        setDisplayValue(formatTime(value, format));
    }, [value, format]);

    const handleBlur = () => {
        const parsed = parseTime(displayValue, format);
        if (parsed) {
            // If valid, update parent and re-format display
            onChange(parsed);
            setDisplayValue(formatTime(parsed, format));
        } else {
            // If invalid, revert to original value
            setDisplayValue(formatTime(value, format));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <Input
            value={displayValue}
            onChange={(e) => setDisplayValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
            placeholder={format === '12h' ? '08:00 AM' : '08:00'}
        />
    );
}

function formatTime(hhmm: string, format: '12h' | '24h'): string {
    if (!hhmm) return '';
    const [hStr, mStr] = hhmm.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr;

    if (format === '24h') {
        return `${h.toString().padStart(2, '0')}:${m}`;
    } else {
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12; // 0 -> 12, 13 -> 1
        return `${displayH.toString().padStart(2, '0')}:${m} ${period}`;
    }
}

function parseTime(input: string, format: '12h' | '24h'): string | null {
    const clean = input.trim().toLowerCase();

    // Basic validation regex could be added, but manual parsing is more flexible
    if (!clean) return null;

    if (format === '24h') {
        // Expect HH:mm
        const parts = clean.split(':');
        let h = parseInt(parts[0], 10);
        let m = 0;
        if (parts.length > 1) {
            m = parseInt(parts[1], 10);
        }

        if (isNaN(h) || h < 0 || h > 23) return null;
        if (isNaN(m) || m < 0 || m > 59) return null;

        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    } else {
        // 12h parsing
        // Detect PM
        const isPM = clean.includes('p');
        const isAM = clean.includes('a');

        // Remove text to get numbers
        const numPart = clean.replace(/[^\d:]/g, '');
        const parts = numPart.split(':');

        let h = parseInt(parts[0], 10);
        let m = 0;
        if (parts.length > 1) {
            m = parseInt(parts[1], 10);
        } else if (clean.includes(' ')) {
            // Maybe "8 30 pm"
            const spaceParts = clean.split(' ');
            const mins = spaceParts.find(p => p.match(/^\d{2}$/));
            if (mins) m = parseInt(mins, 10);
        }

        if (isNaN(h) || h < 1 || h > 12) {
            // Fallback: if user typed "13", treat as 24h even in 12h mode if strictly numeric?
            // Or fail? Let's check ranges.
            if (h === 0) return null; // 0 is not valid in 12h usually, but 00:00 is 24h
            if (h > 12 && h < 24 && !isAM && !isPM) {
                // Assume accidental 24h input
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            }
            return null;
        }
        if (isNaN(m) || m < 0 || m > 59) return null;

        // Convert to 24h
        if (isPM && h !== 12) h += 12;
        if (isAM && h === 12) h = 0;
        // If neither, default behavior? 
        // "8:00" -> 8:00 AM usually. 
        // "11:00" -> 11:00 AM.
        // "12:00" -> 12:00 PM (Noon) typically? Or if user didn't specify, maybe we assume AM?
        // Let's assume AM mostly, but maybe matching the current time period of the original value?
        // No, standard UI behavior is AM unless PM specified.
        if (!isPM && !isAM && h === 12) {
            // "12:00" without suffix usually means 12:00 PM (noon) in loose typing?
            // But strict 12h clock 12:00 is ambiguous without AM/PM.
            // Let's standard: 12 -> 12:00 (PM? No 12:00 usually implies noon if just 12).
            // Let's default to preserving PM if it was already PM? No that's confusing.
            // Let's default to AM for 1-11, and PM for 12?
            // Actually, let's treat "12" as 12:00 PM (Noon) if no suffix.
            // And "1" as 1:00 AM.
            // Actually, if h != 12, assume AM. if h == 12, assume PM (Noon).
            // This covers the "Lunch: 12:00" case nicely.
            if (h === 12) {
                // keep as 12 (which is PM in 24h logic: 12)
            } else {
                // keep as h (which is AM)
            }
        }

        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
}
