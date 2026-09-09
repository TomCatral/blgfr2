export type DialogRequest = {
  type: 'confirm' | 'prompt';
  message: string;
  defaultValue?: string;
  resolve: (value: boolean | string | null) => void;
};

type DialogListener = (request: DialogRequest) => void;
let listener: DialogListener | null = null;

export const subscribeToDialogs = (nextListener: DialogListener) => {
  listener = nextListener;
  return () => {
    if (listener === nextListener) listener = null;
  };
};

export const showConfirm = (message: string) =>
  new Promise<boolean>((resolve) => {
    if (!listener) {
      resolve(false);
      return;
    }
    listener({
      type: 'confirm',
      message,
      resolve: (value) => resolve(value === true),
    });
  });

export const showPrompt = (message: string, defaultValue = '') =>
  new Promise<string | null>((resolve) => {
    if (!listener) {
      resolve(null);
      return;
    }
    listener({
      type: 'prompt',
      message,
      defaultValue,
      resolve: (value) => resolve(typeof value === 'string' ? value : null),
    });
  });
