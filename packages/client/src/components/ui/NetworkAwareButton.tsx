import React from 'react';
import { useNetwork } from '../../contexts/NetworkContext';

interface NetworkAwareButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /**
   * Whether the button requires network connectivity to function
   * @default true
   */
  requiresNetwork?: boolean;
  /**
   * Optional custom tooltip when disabled due to network issues
   */
  networkDisabledTooltip?: string;
  /**
   * Optional custom className when disabled due to network issues
   */
  networkDisabledClassName?: string;
}

const NetworkAwareButton: React.FC<NetworkAwareButtonProps> = ({
  children,
  requiresNetwork = true,
  networkDisabledTooltip = 'Action unavailable while offline',
  networkDisabledClassName = 'opacity-50 cursor-not-allowed',
  disabled,
  className = '',
  ...props
}) => {
  const { isFullyConnected } = useNetwork();
  const isNetworkDisabled = requiresNetwork && !isFullyConnected;
  const isActuallyDisabled = disabled || isNetworkDisabled;

  const getTooltip = () => {
    if (disabled) return props.title;
    if (isNetworkDisabled) return networkDisabledTooltip;
    return props.title;
  };

  const getClassName = () => {
    const baseClasses = className || 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700';
    if (isNetworkDisabled) {
      return `${baseClasses} ${networkDisabledClassName}`;
    }
    return baseClasses;
  };

  return (
    <button
      {...props}
      disabled={isActuallyDisabled}
      title={getTooltip()}
      className={getClassName()}
    >
      {children}
    </button>
  );
};

export default NetworkAwareButton;
