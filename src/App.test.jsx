import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the retirement calculator', () => {
  render(<App />);
  expect(screen.getByText('Retire')).toBeInTheDocument();
  expect(screen.getByText('Basic Calculator')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Advanced/i })).not.toBeInTheDocument();
});
