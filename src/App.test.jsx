import { render, screen } from '@testing-library/react';
import App from './App';

test('renders retirement calculator navigation', () => {
  render(<App />);
  expect(screen.getByText('Retire')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Basic/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Advanced/i })).toBeInTheDocument();
});
