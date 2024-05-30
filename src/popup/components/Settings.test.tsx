import { render, screen, fireEvent } from '@testing-library/react';
import Settings, { Storage } from './Settings';

const mockEmptyStorage: Storage = {
  get: (_keys, callback) => callback({}),
  set: (_items, callback) => callback(),
};

describe('<Settings />', () => {
  test('should display a blank settings form', () => {
    render(<Settings storage={mockEmptyStorage} />);

    const apiKeyInput = screen.getByLabelText(/API Key:/i);
    expect(apiKeyInput).toHaveValue('');

    const modelNameSelect = screen.getByLabelText(/Model Name:/i);
    expect(modelNameSelect).toHaveValue('gpt-4o');
  });

  test('changes API key value', () => {
    render(<Settings storage={mockEmptyStorage} />);
    const apiKeyInput = screen.getByLabelText(/API Key:/i);
    fireEvent.change(apiKeyInput, { target: { value: 'new-key' } });
    expect(apiKeyInput).toHaveValue('new-key');
  });

  test('changes model name value', () => {
    render(<Settings storage={mockEmptyStorage} />);
    const modelNameSelect = screen.getByLabelText(/Model Name:/i);
    fireEvent.change(modelNameSelect, { target: { value: 'model3' } });
    expect(modelNameSelect).toHaveValue('model3');
  });
});
