import React, { forwardRef, useId } from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import { ControllerRenderProps } from 'react-hook-form';
import clsx from 'clsx';

import './SwitchBox.scss';

type SwitchBoxProps = Partial<ControllerRenderProps> & {
  name: string;
  label: string;
  checked?: boolean;
  hideLabel?: boolean;
  labelClassName?: string;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const SwitchBox = forwardRef<HTMLButtonElement, SwitchBoxProps>((
  {
    label,
    checked,
    hideLabel,
    labelClassName,
    disabled,
    onCheckedChange,
  },
  ref,
) => {
  const id = useId();

  return (
    <div className='switchbox'>
      {label && !hideLabel && (
        <label htmlFor={id} className={clsx('switch__label', labelClassName)}>
          {label}
        </label>
      )}
      <RadixSwitch.Root
        ref={ref}
        id={id}
        className='switchbox__button'
        aria-label={hideLabel ? label : undefined}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      >
        <RadixSwitch.Thumb className='switchbox__thumb' />
      </RadixSwitch.Root>
    </div>
  );
});

export default SwitchBox;
