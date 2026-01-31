import type {
  TTSRequest,
  TTSResponse,
  ApiResult,
  IElevenLabsService,
} from '../types';

// ElevenLabs API configuration
const ELEVENLABS_API_URL = import.meta.env.VITE_ELEVENLABS_API_URL || '';
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';

class ElevenLabsService implements IElevenLabsService {
  async generateSpeech(request: TTSRequest): Promise<ApiResult<TTSResponse>> {
    // Check if ElevenLabs is configured
    if (!ELEVENLABS_API_URL || !ELEVENLABS_API_KEY) {
      console.log('ElevenLabs API not configured - audio playback disabled');
      return {
        success: false,
        error: {
          code: 'TTS_NOT_CONFIGURED',
          message: 'Text-to-speech service is not configured',
        },
      };
    }

    try {
      // Call ElevenLabs API directly
      const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${request.voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: request.text,
          model_id: 'eleven_monolingual_v1',
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // Get audio blob and create URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        success: true,
        data: { audioUrl },
      };
    } catch (error) {
      console.warn('ElevenLabs API error:', error);
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
