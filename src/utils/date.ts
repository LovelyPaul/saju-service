import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * Format date string to Korean format
 * @param dateString - ISO date string (e.g., "2025-01-15")
 * @returns Formatted date (e.g., "2025년 1월 15일")
 */
export function formatDate(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, 'yyyy년 M월 d일', { locale: ko });
}

/**
 * Format datetime string to Korean format with time
 * @param dateString - ISO datetime string (e.g., "2025-01-15T10:30:00Z")
 * @returns Formatted datetime (e.g., "2025년 1월 15일 10:30")
 */
export function formatDateTime(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, 'yyyy년 M월 d일 HH:mm', { locale: ko });
}

/**
 * Format relative time from now
 * @param dateString - ISO datetime string (e.g., "2025-01-15T10:30:00Z")
 * @returns Relative time (e.g., "3일 전")
 */
export function formatRelativeTime(dateString: string): string {
  const date = parseISO(dateString);
  return formatDistanceToNow(date, { addSuffix: true, locale: ko });
}
