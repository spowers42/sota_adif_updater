import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

import { input, confirm } from '@inquirer/prompts';
import { readFile, writeFile } from 'node:fs/promises';
import { runFlow } from '../../src/prompts/flow.js';

const mockedInput = vi.mocked(input);
const mockedConfirm = vi.mocked(confirm);
const mockedReadFile = vi.mocked(readFile);
const mockedWriteFile = vi.mocked(writeFile);

const VALID_ADIF = '<ADIF_VER:5>3.1.4 <EOH>\n\n<CALL:4>W1AW <BAND:3>40m <EOR>\n';
const ADIF_WITH_SOTA = '<ADIF_VER:5>3.1.4 <EOH>\n\n<CALL:4>W1AW <SOTA_REF:8>G/LD-003 <EOR>\n';
const ADIF_WITH_POTA = '<ADIF_VER:5>3.1.4 <EOH>\n\n<CALL:4>W1AW <POTA_REF:6>K-9999 <EOR>\n';

beforeEach(() => {
  vi.clearAllMocks();
  mockedReadFile.mockResolvedValue(VALID_ADIF);
  mockedWriteFile.mockResolvedValue(undefined);
});

describe('runFlow', () => {
  it('exits without writing when the user skips both SOTA and POTA', async () => {
    mockedInput.mockResolvedValueOnce('/fake/file.adi');
    mockedConfirm
      .mockResolvedValueOnce(false) // skip SOTA
      .mockResolvedValueOnce(false); // skip POTA

    await runFlow();

    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  it('writes the file with only a SOTA ref when POTA is skipped', async () => {
    mockedInput
      .mockResolvedValueOnce('/fake/file.adi')
      .mockResolvedValueOnce('W2/WE-003');
    mockedConfirm
      .mockResolvedValueOnce(true)  // add SOTA
      .mockResolvedValueOnce(false) // skip POTA
      .mockResolvedValueOnce(true); // confirm apply

    await runFlow();

    expect(mockedWriteFile).toHaveBeenCalledOnce();
    const written = mockedWriteFile.mock.calls[0][1] as string;
    expect(written).toContain('<SOTA_REF:9>W2/WE-003');
    expect(written).not.toContain('POTA_REF');
  });

  it('writes the file with only a POTA ref when SOTA is skipped', async () => {
    mockedInput
      .mockResolvedValueOnce('/fake/file.adi')
      .mockResolvedValueOnce('K-5033');
    mockedConfirm
      .mockResolvedValueOnce(false) // skip SOTA
      .mockResolvedValueOnce(true)  // add POTA
      .mockResolvedValueOnce(false) // no more POTA
      .mockResolvedValueOnce(true); // confirm apply

    await runFlow();

    expect(mockedWriteFile).toHaveBeenCalledOnce();
    const written = mockedWriteFile.mock.calls[0][1] as string;
    expect(written).toContain('<POTA_REF:6>K-5033');
    expect(written).not.toContain('SOTA_REF');
  });

  it('collects multiple POTA refs and writes them comma-delimited', async () => {
    mockedInput
      .mockResolvedValueOnce('/fake/file.adi')
      .mockResolvedValueOnce('K-5033')
      .mockResolvedValueOnce('K-5034');
    mockedConfirm
      .mockResolvedValueOnce(false) // skip SOTA
      .mockResolvedValueOnce(true)  // add POTA
      .mockResolvedValueOnce(true)  // add another POTA
      .mockResolvedValueOnce(false) // no more POTA
      .mockResolvedValueOnce(true); // confirm apply

    await runFlow();

    const written = mockedWriteFile.mock.calls[0][1] as string;
    expect(written).toContain('<POTA_REF_LIST:13>K-5033,K-5034');
    expect(written).not.toContain('<POTA_REF:');
  });

  it('writes both SOTA and multiple POTA refs using POTA_REF_LIST', async () => {
    mockedInput
      .mockResolvedValueOnce('/fake/file.adi')
      .mockResolvedValueOnce('W2/WE-003')
      .mockResolvedValueOnce('K-5033')
      .mockResolvedValueOnce('K-5034');
    mockedConfirm
      .mockResolvedValueOnce(true)  // add SOTA
      .mockResolvedValueOnce(true)  // add POTA
      .mockResolvedValueOnce(true)  // add another POTA
      .mockResolvedValueOnce(false) // no more POTA
      .mockResolvedValueOnce(true); // confirm apply

    await runFlow();

    const written = mockedWriteFile.mock.calls[0][1] as string;
    expect(written).toContain('<SOTA_REF:9>W2/WE-003');
    expect(written).toContain('<POTA_REF_LIST:13>K-5033,K-5034');
  });

  it('does not write when the user declines confirmation', async () => {
    mockedInput
      .mockResolvedValueOnce('/fake/file.adi')
      .mockResolvedValueOnce('W2/WE-003');
    mockedConfirm
      .mockResolvedValueOnce(true)  // add SOTA
      .mockResolvedValueOnce(false) // skip POTA
      .mockResolvedValueOnce(false); // decline apply

    await runFlow();

    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  it('re-prompts for the file path when reading fails', async () => {
    mockedInput
      .mockResolvedValueOnce('/bad/path.adi')
      .mockResolvedValueOnce('/fake/file.adi');
    mockedReadFile
      .mockRejectedValueOnce(new Error('ENOENT: no such file'))
      .mockResolvedValueOnce(VALID_ADIF);
    mockedConfirm
      .mockResolvedValueOnce(false) // skip SOTA
      .mockResolvedValueOnce(false); // skip POTA

    await runFlow();

    expect(mockedInput).toHaveBeenCalledTimes(2);
  });

  it('re-prompts for the file path when content is not valid ADIF', async () => {
    mockedInput
      .mockResolvedValueOnce('/not-adif.txt')
      .mockResolvedValueOnce('/fake/file.adi');
    mockedReadFile
      .mockResolvedValueOnce('not adif content at all')
      .mockResolvedValueOnce(VALID_ADIF);
    mockedConfirm
      .mockResolvedValueOnce(false) // skip SOTA
      .mockResolvedValueOnce(false); // skip POTA

    await runFlow();

    expect(mockedInput).toHaveBeenCalledTimes(2);
  });

  it('writes the file to the correct path', async () => {
    mockedInput
      .mockResolvedValueOnce('/specific/path/log.adi')
      .mockResolvedValueOnce('W2/WE-003');
    mockedConfirm
      .mockResolvedValueOnce(true)  // add SOTA
      .mockResolvedValueOnce(false) // skip POTA
      .mockResolvedValueOnce(true); // confirm apply

    await runFlow();

    expect(mockedWriteFile).toHaveBeenCalledWith(
      '/specific/path/log.adi',
      expect.any(String),
      'utf-8',
    );
  });

  describe('existing reference warnings', () => {
    it('asks to replace existing SOTA_REF and writes new value when confirmed', async () => {
      mockedReadFile.mockResolvedValue(ADIF_WITH_SOTA);
      mockedInput
        .mockResolvedValueOnce('/fake/file.adi')
        .mockResolvedValueOnce('W2/WE-003');
      mockedConfirm
        .mockResolvedValueOnce(true)  // replace existing SOTA
        .mockResolvedValueOnce(false) // skip POTA
        .mockResolvedValueOnce(true); // confirm apply

      await runFlow();

      expect(mockedWriteFile).toHaveBeenCalledOnce();
      const written = mockedWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('<SOTA_REF:9>W2/WE-003');
      expect(written).not.toContain('G/LD-003');
    });

    it('skips SOTA update and does not write when user declines to replace existing SOTA_REF', async () => {
      mockedReadFile.mockResolvedValue(ADIF_WITH_SOTA);
      mockedInput.mockResolvedValueOnce('/fake/file.adi');
      mockedConfirm
        .mockResolvedValueOnce(false) // decline replacing existing SOTA
        .mockResolvedValueOnce(false); // skip POTA

      await runFlow();

      expect(mockedWriteFile).not.toHaveBeenCalled();
    });

    it('asks to replace existing POTA_REF and writes new value when confirmed', async () => {
      mockedReadFile.mockResolvedValue(ADIF_WITH_POTA);
      mockedInput
        .mockResolvedValueOnce('/fake/file.adi')
        .mockResolvedValueOnce('K-5033');
      mockedConfirm
        .mockResolvedValueOnce(false) // skip SOTA
        .mockResolvedValueOnce(true)  // replace existing POTA
        .mockResolvedValueOnce(false) // no more POTA
        .mockResolvedValueOnce(true); // confirm apply

      await runFlow();

      expect(mockedWriteFile).toHaveBeenCalledOnce();
      const written = mockedWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('<POTA_REF:6>K-5033');
      expect(written).not.toContain('K-9999');
    });

    it('skips POTA update and does not write when user declines to replace existing POTA_REF', async () => {
      mockedReadFile.mockResolvedValue(ADIF_WITH_POTA);
      mockedInput.mockResolvedValueOnce('/fake/file.adi');
      mockedConfirm
        .mockResolvedValueOnce(false) // skip SOTA
        .mockResolvedValueOnce(false); // decline replacing existing POTA

      await runFlow();

      expect(mockedWriteFile).not.toHaveBeenCalled();
    });
  });
});
