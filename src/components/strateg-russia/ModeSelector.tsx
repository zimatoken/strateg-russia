import React from 'react';
import './styles.css';

export type DialogMode = 'talent-analysis' | 'career-consult' | 'technical-help';

interface ModeSelectorProps {
  selectedMode: DialogMode;
  onModeChange: (mode: DialogMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onModeChange }) => {
  const modes = [
    {
      id: 'talent-analysis' as DialogMode,
      title: 'Анализ талантов',
      description: 'Проанализирую ваши сильные стороны и навыки',
      icon: ''
    },
    {
      id: 'career-consult' as DialogMode,
      title: 'Карьерная консультация',
      description: 'Помогу с карьерными решениями и развитием',
      icon: ''
    },
    {
      id: 'technical-help' as DialogMode,
      title: 'Техническая помощь',
      description: 'Отвечу на технические вопросы по СТРАТЕГ',
      icon: ''
    }
  ];

  return (
    <div className="mode-selector">
      <h4>Выберите режим диалога:</h4>
      <div className="mode-grid">
        {modes.map((mode) => (
          <div
            key={mode.id}
            className={`mode-card ${selectedMode === mode.id ? 'mode-card--active' : ''}`}
            onClick={() => onModeChange(mode.id)}
          >
            <div className="mode-icon">{mode.icon}</div>
            <div className="mode-title">{mode.title}</div>
            <div className="mode-description">{mode.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;
