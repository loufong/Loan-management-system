import React from 'react';
import { BorrowerList, BorrowerListProps } from './BorrowerList';

export interface BorrowersViewProps extends BorrowerListProps {}

/**
 * BorrowersView Component
 * Renders the primary Institutional Borrowers Directory table and 360° Dossier
 */
export const BorrowersView: React.FC<BorrowersViewProps> = (props) => {
  return <BorrowerList {...props} />;
};

export default BorrowersView;
