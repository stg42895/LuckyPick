import { supabase } from '../lib/supabase';

export interface OTPResponse {
  success: boolean;
  message: string;
  data?: any;
}

export class OTPService {
  /**
   * Send OTP to email address
   */
  static async sendOTP(email: string): Promise<OTPResponse> {
    try {
      // Check if can resend OTP (rate limiting)
      const { data: canResend, error: canResendError } = await supabase
        .rpc('can_resend_otp', { user_email: email });

      if (canResendError) {
        throw canResendError;
      }

      if (!canResend) {
        return {
          success: false,
          message: 'Please wait before requesting another OTP. You can resend after 1 minute.'
        };
      }

      // Create email verification record
      const { data, error } = await supabase
        .rpc('create_email_verification', { user_email: email });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const { otp_code, expires_at } = data[0];
        
        // In a real application, you would send the OTP via email service
        // For demo purposes, we'll log it to console
        console.log(`OTP for ${email}: ${otp_code}`);
        console.log(`Expires at: ${expires_at}`);

        // Simulate email sending
        await this.simulateEmailSending(email, otp_code);

        return {
          success: true,
          message: 'OTP sent successfully to your email address.',
          data: {
            expires_at,
            // Don't send OTP in production - this is for demo only
            otp_code: process.env.NODE_ENV === 'development' ? otp_code : undefined
          }
        };
      }

      return {
        success: false,
        message: 'Failed to generate OTP. Please try again.'
      };
    } catch (error) {
      console.error('Error sending OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again later.'
      };
    }
  }

  /**
   * Verify OTP code
   */
  static async verifyOTP(email: string, otpCode: string): Promise<OTPResponse> {
    try {
      const { data, error } = await supabase
        .rpc('verify_otp', { 
          user_email: email, 
          provided_otp: otpCode 
        });

      if (error) {
        throw error;
      }

      if (data === true) {
        return {
          success: true,
          message: 'Email verified successfully!'
        };
      } else {
        return {
          success: false,
          message: 'Invalid or expired OTP code. Please try again.'
        };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Verification failed. Please try again.'
      };
    }
  }

  /**
   * Check if email is already verified
   */
  static async isEmailVerified(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('is_email_verified', { user_email: email });

      if (error) {
        console.error('Error checking email verification:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  }

  /**
   * Simulate email sending (for demo purposes)
   */
  private static async simulateEmailSending(email: string, otpCode: string): Promise<void> {
    // In a real application, integrate with email service like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Resend
    // - Nodemailer with SMTP

    console.log(`
      📧 Email Simulation
      To: ${email}
      Subject: LuckyPick - Email Verification Code
      
      Your verification code is: ${otpCode}
      
      This code will expire in 10 minutes.
      
      If you didn't request this code, please ignore this email.
    `);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Clean up expired OTPs (utility function)
   */
  static async cleanupExpiredOTPs(): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_expired_otps');
      if (error) {
        console.error('Error cleaning up expired OTPs:', error);
      }
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }
}