import { useState } from 'react';

const EMOJI_CATEGORIES = {
    'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
    'Gestures': ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤝', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
    'Objects': ['🎉', '🎊', '🎁', '🎈', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎯', '🎮', '🎲', '🎭', '🎨', '🎬', '🎤', '🎧', '🎵', '🎶', '🎹', '🎸', '🎺', '🎻', '🥁', '📱', '💻', '🖥️', '📷', '📹', '🎥', '📞', '☎️', '📺', '📻', '⏰', '⏱️', '⌚', '💡', '🔦', '🕯️', '📚', '📖', '📝', '✏️', '🖊️', '🖋️'],
    'Work': ['💼', '📁', '📂', '📅', '📆', '📊', '📈', '📉', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '🗑️', '🔒', '🔓', '🔐', '🔑', '🗝️', '🔨', '⛏️', '⚒️', '🛠️', '🗡️', '⚔️', '💣', '🔫', '🏹', '🛡️', '🔧', '🔩', '⚙️', '🗜️', '⚖️', '🦯', '🔗', '⛓️', '🧰', '🧲'],
};

export default function EmojiPicker({ onSelect, onClose }) {
    const [activeCategory, setActiveCategory] = useState('Smileys');
    const [search, setSearch] = useState('');

    const filteredEmojis = search
        ? Object.values(EMOJI_CATEGORIES).flat().filter(e => e.includes(search))
        : EMOJI_CATEGORIES[activeCategory] || [];

    return (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 z-50 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
                <div className="relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                    <input
                        type="text"
                        placeholder="Tìm emoji..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-lg text-sm border-none outline-none focus:bg-gray-100"
                    />
                </div>
            </div>

            {/* Categories */}
            {!search && (
                <div className="flex gap-1 px-2 py-1.5 border-b border-gray-100 overflow-x-auto custom-scrollbar">
                    {Object.keys(EMOJI_CATEGORIES).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${activeCategory === cat
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'text-gray-500 hover:bg-gray-100'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* Emoji Grid */}
            <div className="grid grid-cols-8 gap-1 p-2 max-h-48 overflow-y-auto custom-scrollbar">
                {filteredEmojis.map((emoji, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            onSelect(emoji);
                            onClose?.();
                        }}
                        className="w-9 h-9 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition-transform hover:scale-110"
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            {/* Quick Access */}
            <div className="flex gap-2 p-2 border-t border-gray-100 bg-gray-50">
                {['👍', '❤️', '😂', '😮', '😢', '🎉'].map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => {
                            onSelect(emoji);
                            onClose?.();
                        }}
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white rounded-lg shadow-sm"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}
