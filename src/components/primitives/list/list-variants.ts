import { cva } from 'class-variance-authority';
import styles from './List.module.css';

export const listVariants = cva(styles.list, {
  variants: {
    variant: {
      default: styles.default,
      compact: styles.compact,
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});
