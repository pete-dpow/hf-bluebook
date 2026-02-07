import React, { useState } from 'react';

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  options: DropdownOption[];
  onSelection: (value: string) => void;
}

function Dropdown({ options, onSelection }: DropdownProps) {
  const [selected, setSelected] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(event.target.value);
    onSelection(event.target.value);
  };

  return (
    <select value={selected} onChange={handleChange}>
      <option value="">Select...</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

export default Dropdown;
