// STAGE7: Global search bar component

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchAll, type SearchResult } from '../lib/search';
import { getAvatarPath } from '../lib/avatarRegistry';

interface SearchBarProps {
  onContactSelect: (contactId: string) => void;
  onGroupSelect: (groupId: string) => void;
  onMessageSelect: (contactId: string, messageId: string) => void;
}

export default function SearchBar({ onContactSelect, onGroupSelect, onMessageSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // STAGE7: Hotkey support (Ctrl+K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // STAGE7: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // STAGE7: Perform search
  useEffect(() => {
    let isMounted = true;

    if (query.trim()) {
      void (async () => {
        const searchResults = await searchAll(query);
        if (isMounted) {
          setResults(searchResults);
          setShowDropdown(true);
          setSelectedIndex(-1);
        }
      })();
    } else {
      // STAGE7: defer state update to avoid synchronous setState warning
      if (isMounted) {
        setTimeout(() => {
          if (isMounted) {
            setResults([]);
            setShowDropdown(false);
          }
        }, 0);
      }
    }

    return () => { isMounted = false; };
  }, [query]);

  // STAGE7: Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  const handleSelect = useCallback((result: SearchResult) => {
    setShowDropdown(false);
    setQuery('');
    setSelectedIndex(-1);

    if (result.type === 'contact') {
      onContactSelect(result.id);
    } else if (result.type === 'group') {
      onGroupSelect(result.id);
    } else if (result.type === 'message') {
      onMessageSelect(result.contactId || result.id, result.id);
    }
  }, [onContactSelect, onGroupSelect, onMessageSelect]);

  const groupedResults = {
    contacts: results.filter(r => r.type === 'contact'),
    groups: results.filter(r => r.type === 'group'),
    messages: results.filter(r => r.type === 'message'),
  };

  return (
    <div className="search-bar-container">
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Поиск контактов, групп, сообщений..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setShowDropdown(true)}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => {
              setQuery('');
              setShowDropdown(false);
            }}
            title="Очистить"
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="search-dropdown" ref={dropdownRef}>
          {groupedResults.contacts.length > 0 && (
            <div className="search-category">
              <div className="search-category-title">Контакты</div>
              {groupedResults.contacts.map((result, _idx) => (
                <div
                  key={`contact-${result.id}`}
                  className={`search-item ${selectedIndex === results.indexOf(result) ? 'search-item-active' : ''}`}
                  onClick={() => handleSelect(result)}
                >
                  <img
                    src={getAvatarPath(result.avatar || 'avatar-robot')}
                    alt=""
                    className="search-item-avatar"
                  />
                  <div className="search-item-content">
                    <div className="search-item-title">{result.title}</div>
                    <div className="search-item-subtitle">{result.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {groupedResults.groups.length > 0 && (
            <div className="search-category">
              <div className="search-category-title">Группы</div>
              {groupedResults.groups.map((result, _idx) => (
                <div
                  key={`group-${result.id}`}
                  className={`search-item ${selectedIndex === results.indexOf(result) ? 'search-item-active' : ''}`}
                  onClick={() => handleSelect(result)}
                >
                  <img
                    src={getAvatarPath(result.avatar || 'avatar-robot')}
                    alt=""
                    className="search-item-avatar"
                  />
                  <div className="search-item-content">
                    <div className="search-item-title">{result.title}</div>
                    <div className="search-item-subtitle">{result.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {groupedResults.messages.length > 0 && (
            <div className="search-category">
              <div className="search-category-title">Сообщения</div>
              {groupedResults.messages.map((result, _idx) => (
                <div
                  key={`message-${result.id}`}
                  className={`search-item ${selectedIndex === results.indexOf(result) ? 'search-item-active' : ''}`}
                  onClick={() => handleSelect(result)}
                >
                  <div className="search-item-content">
                    <div className="search-item-title">{result.title}</div>
                    <div className="search-item-subtitle">{result.subtitle}</div>
                    {result.timestamp && (
                      <div className="search-item-time">
                        {new Date(result.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && (
            <div className="search-empty">Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
}
