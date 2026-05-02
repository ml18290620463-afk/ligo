import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useAttachmentUpload } from './useAttachmentUpload';
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_WARN_BYTES } from '../services/diaryStorage';

const fakeChange = (file: File): React.ChangeEvent<HTMLInputElement> =>
  ({
    target: { files: [file] },
  }) as unknown as React.ChangeEvent<HTMLInputElement>;

const buildFile = (size: number, type = 'image/png'): File => {
  const file = new File([new Uint8Array(0)], 'asset.png', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

class StubFileReader {
  result: string | null = null;
  onload: (this: StubFileReader, ev: ProgressEvent) => void = () => {};
  onerror: (this: StubFileReader, ev: ProgressEvent) => void = () => {};
  readAsDataURL() {
    queueMicrotask(() => {
      this.result = 'data:image/png;base64,abc';
      this.onload({ target: this } as unknown as ProgressEvent);
    });
  }
}

const installFileReader = () => {
  const original = (globalThis as Record<string, unknown>).FileReader;
  (globalThis as Record<string, unknown>).FileReader = StubFileReader;
  return () => {
    (globalThis as Record<string, unknown>).FileReader = original;
  };
};

describe('useAttachmentUpload', () => {
  it('rejects files above the hard limit and never reads them', async () => {
    const restore = installFileReader();
    const onTooLarge = vi.fn();
    const onStaged = vi.fn();
    const { result } = renderHook(() =>
      useAttachmentUpload({
        onTooLarge,
        onLargeWarning: vi.fn(),
        onReadError: vi.fn(),
        onStaged,
      }),
    );

    await act(async () => {
      await result.current.handleChange(fakeChange(buildFile(ATTACHMENT_MAX_BYTES + 1)));
    });

    expect(onTooLarge).toHaveBeenCalledOnce();
    expect(onStaged).not.toHaveBeenCalled();
    restore();
  });

  it('stages successful reads and triggers the soft warning at the threshold', async () => {
    const restore = installFileReader();
    const onLargeWarning = vi.fn();
    const onStaged = vi.fn();

    const { result } = renderHook(() =>
      useAttachmentUpload({
        onTooLarge: vi.fn(),
        onLargeWarning,
        onReadError: vi.fn(),
        onStaged,
      }),
    );

    await act(async () => {
      await result.current.handleChange(fakeChange(buildFile(ATTACHMENT_WARN_BYTES + 1)));
      await Promise.resolve();
    });

    expect(onLargeWarning).toHaveBeenCalledOnce();
    expect(onStaged).toHaveBeenCalledOnce();
    expect(onStaged.mock.calls[0][0]).toMatchObject({
      type: 'image',
      data: 'data:image/png;base64,abc',
    });
    restore();
  });
});
