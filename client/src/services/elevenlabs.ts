import type {
  TTSRequest,
  TTSResponse,
  ApiResult,
  IElevenLabsService,
} from '../types';
import api from './api';

class ElevenLabsService implements IElevenLabsService {
  async generateSpeech(request: TTSRequest): Promise<ApiResult<TTSResponse>> {
    try {
      const response = await api.generateSpeech({
        text: request.text,
        voiceId: request.voiceId,
      });
      return { success: true, data: response as TTSResponse };
    } catch (error) {
      console.error('TTS service unavailable:', error);
      return {
        success: false,
        error: {
          code: 'TTS_UNAVAILABLE',
          message: 'Text-to-speech service is not available',
        },
      };
    }
  }

  async generateReportAudio(summary: string): Promise<string | null> {
    const result = await this.generateSpeech({
      text: this.formatForSpeech(summary),
      voiceId: 'ship_computer',
    });

    return result.success ? result.data.audioUrl : null;
  }

  private formatForSpeech(text: string): string {
    return text
      .replace(/\./g, '... ')
      .replace(/XSS/g, 'Cross Site Scripting')
      .replace(/SQL/g, 'S Q L')
      .replace(/RCE/g, 'Remote Code Execution')
      .replace(/SSRF/g, 'Server Side Request Forgery')
      .replace(/CRITICAL/g, 'CRITICAL')
      .replace(/HIGH/g, 'HIGH');
  }
}

export const elevenlabsService = new ElevenLabsService();
export default elevenlabsService;
