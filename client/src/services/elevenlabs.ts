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
    } catch (error) {
      // Log detailed error for debugging
      console.error('ElevenLabs TTS Error:', error);

      // Extract error message from API response if available
      let errorMessage = 'Text-to-speech service is not available';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', errorMessage);
      }

      console.log('Text-to-speech service is not available - audio playback disabled');
      return {
        success: false,
        error: {
          code: 'TTS_UNAVAILABLE',
          message: errorMessage,
        },
      };
    }
  }

  // Generate speech from audit report summary
  async generateReportAudio(summary: string): Promise<ApiResult<TTSResponse>> {
    return await this.generateSpeech({
      text: this.formatForSpeech(summary),
      voiceId: 'ship_computer',
    });
  }

  // Format text for better speech synthesis
  private formatForSpeech(text: string): string {
    // Add pauses after periods
    let formatted = text.replace(/\./g, '... ');

    // Expand abbreviations for better pronunciation
    formatted = formatted.replace(/\bXSS\b/g, 'Cross Site Scripting');
    formatted = formatted.replace(/\bSQL\b/g, 'S Q L');
    formatted = formatted.replace(/\bRCE\b/g, 'Remote Code Execution');
    formatted = formatted.replace(/\bSSRF\b/g, 'Server Side Request Forgery');
    formatted = formatted.replace(/\bAPI\b/g, 'A P I');
    formatted = formatted.replace(/\bDDoS\b/g, 'D DoS');

    // Add emphasis to severity levels with pauses
    formatted = formatted.replace(/\bCRITICAL\b/g, 'CRITICAL...');
    formatted = formatted.replace(/\bHIGH\b/g, 'HIGH...');

    return formatted;
  }
}

export const elevenlabsService = new ElevenLabsService();
export default elevenlabsService;
