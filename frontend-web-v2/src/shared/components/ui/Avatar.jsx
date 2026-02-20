/**
 * Avatar — hiển thị avatar với fallback initials.
 * Dùng indigo gradient làm background khi không có ảnh.
 * 
 * @param {string} [name] - tên để tạo initials
 * @param {string} [src] - URL ảnh avatar
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [size='md']
 * @param {string} [className]
 */
export default function Avatar({ name, src, size = 'md', className = '' }) {
    const sizeClasses = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-xl',
    };

    const initials = name
        ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    if (src) {
        return (
            <img
                src={src}
                alt={name || 'Avatar'}
                className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 ${className}`}
            />
        );
    }

    return (
        <div
            className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
            aria-label={name || 'Avatar'}
            role="img"
        >
            {initials}
        </div>
    );
}
