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
      // Try to use real API first
      const response = await api.generateSpeech({
        text: request.text,
        voiceId: request.voiceId,
      });
      return { success: true, data: response as TTSResponse };
    } catch {
      // Fall back to mock response
      console.log('ElevenLabs API not available - audio playback disabled');
      return {
        success: false,
        error: {
          code: 'TTS_UNAVAILABLE',
          message: 'Text-to-speech service is not available',
        },
      };
    }
  }

  // Generate speech from audit report summary
  async generateReportAudio(summary: string): Promise<string | null> {
    const result = await this.generateSpeech({
      text: this.formatForSpeech(summary),
      voiceId: 'ship_computer',
    });

    if (result.success) {
      return result.data.audioUrl;
    }

    return null;
  }

  // Format text for better speech synthesis
  private formatForSpeech(text: string): string {
    // Add pauses after periods
    let formatted = text.replace(/\./g, '... ');

    // Expand abbreviations
    formatted = formatted.replace(/XSS/g, 'Cross Site Scripting');
    formatted = formatted.replace(/SQL/g, 'SQL');
    formatted = formatted.replace(/RCE/g, 'Remote Code Execution');
    formatted = formatted.replace(/SSRF/g, 'Server Side Request Forgery');

    // Add emphasis to severity levels
    formatted = formatted.replace(/CRITICAL/g, 'CRITICAL');
    formatted = formatted.replace(/HIGH/g, 'HIGH');

    return formatted;
  }
}

export const elevenlabsService = new ElevenLabsService();
export default elevenlabsService;
