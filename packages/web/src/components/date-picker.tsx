import { useState } from 'react';
import { getLocalTimeZone, today } from '@internationalized/date';
import type { DateValue } from 'react-aria-components';
import { DatePicker } from './DatePicker';

export { DatePicker } from './DatePicker';
export type { DatePickerProps } from './DatePicker';

const now = today(getLocalTimeZone());

export const DatePickerControlledDemo = () => {
  const [value, setValue] = useState<DateValue | null>(now);

  return <DatePicker aria-label="Date picker" value={value} onChange={(_str, val) => setValue(val)} />;
};

