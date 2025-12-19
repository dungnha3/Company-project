import { useState, useRef, useEffect } from 'react'

// Emoji categories with commonly used emojis
const EMOJI_CATEGORIES = [
    {
        name: 'Mặt cười',
        icon: '😊',
        emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐']
    },
    {
        name: 'Cử chỉ',
        icon: '👋',
        emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄']
    },
    {
        name: 'Trái tim',
        icon: '❤️',
        emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💋', '💌', '💐', '🌹', '🥀', '🌺', '🌸', '🪷', '💮', '🏵️', '🌻', '🌼', '🌷', '🪻', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🎍', '🎋', '🍀', '☘️', '🍃', '🍂', '🍁', '🌾', '🌿', '🪹', '🪺']
    },
    {
        name: 'Động vật',
        icon: '🐱',
        emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍']
    },
    {
        name: 'Đồ ăn',
        icon: '🍔',
        emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🫑', '🥒', '🌶️', '🫛', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕']
    },
    {
        name: 'Hoạt động',
        icon: '⚽',
        emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🏄', '🏊', '🚣', '🧗', '🚴', '🚵', '🏇', '🎪', '🎭']
    },
    {
        name: 'Đồ vật',
        icon: '💡',
        emojis: ['⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷']
    },
    {
        name: 'Biểu tượng',
        icon: '⭐',
        emojis: ['❗', '❓', '❕', '❔', '‼️', '⁉️', '💯', '🔅', '🔆', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '✔️', '☑️', '✖️', '❌', '❎', '➕', '➖', '➗', '✳️', '✴️', '❇️', '‼️', '〰️', '💱', '💲', '⚕️', '♾️', '🔄', '🔃', '🔀', '🔁', '🔂', '⏩', '⏪', '🔼', '🔽', '⏫', '⏬', '⭐', '🌟', '💫', '✨', '⚡', '🔥', '💥']
    }
]

export default function EmojiPicker({ isOpen, onClose, onSelect, anchorPosition }) {
    const [selectedCategory, setSelectedCategory] = useState(0)
    const [searchTerm, setSearchTerm] = useState('')
    const pickerRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const handleEmojiClick = (emoji) => {
        onSelect(emoji)
    }

    const filteredEmojis = searchTerm
        ? EMOJI_CATEGORIES.flatMap(cat => cat.emojis).filter(emoji => emoji.includes(searchTerm))
        : EMOJI_CATEGORIES[selectedCategory].emojis

    return (
        <div ref={pickerRef} style={styles.container}>
            {/* Header with search */}
            <div style={styles.header}>
                <input
                    type="text"
                    placeholder="Tìm emoji..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
            </div>

            {/* Category tabs */}
            {!searchTerm && (
                <div style={styles.categoryTabs}>
                    {EMOJI_CATEGORIES.map((category, index) => (
                        <button
                            key={category.name}
                            onClick={() => setSelectedCategory(index)}
                            style={{
                                ...styles.categoryTab,
                                backgroundColor: selectedCategory === index ? 'rgba(0, 132, 255, 0.1)' : 'transparent',
                                transform: selectedCategory === index ? 'scale(1.1)' : 'scale(1)',
                            }}
                            title={category.name}
                        >
                            {category.icon}
                        </button>
                    ))}
                </div>
            )}

            {/* Emoji grid */}
            <div style={styles.emojiGrid}>
                {filteredEmojis.map((emoji, index) => (
                    <button
                        key={index}
                        onClick={() => handleEmojiClick(emoji)}
                        style={styles.emojiButton}
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            {/* Category name */}
            {!searchTerm && (
                <div style={styles.categoryName}>
                    {EMOJI_CATEGORIES[selectedCategory].name}
                </div>
            )}
        </div>
    )
}

const styles = {
    container: {
        position: 'absolute',
        bottom: '100%',
        left: '0',
        marginBottom: '10px',
        width: '360px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        zIndex: 1000,
        border: '1px solid rgba(0, 0, 0, 0.06)',
    },
    header: {
        padding: '12px',
        borderBottom: '1px solid #f0f0f0',
    },
    searchInput: {
        width: '100%',
        padding: '10px 14px',
        border: 'none',
        borderRadius: '10px',
        backgroundColor: '#f3f4f6',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
    },
    categoryTabs: {
        display: 'flex',
        flexWrap: 'wrap',
        padding: '8px 12px',
        gap: '4px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
        overflowX: 'hidden',
    },
    categoryTab: {
        width: '36px',
        height: '36px',
        padding: '6px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '18px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    emojiGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '12px 16px',
        maxHeight: '220px',
        overflowY: 'auto',
        overflowX: 'hidden',
    },
    emojiButton: {
        padding: '6px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '22px',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryName: {
        padding: '8px 12px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        borderTop: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
    },
}
