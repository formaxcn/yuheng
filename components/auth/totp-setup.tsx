'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from 'sonner';
import { Loader2, QrCode, Copy, Check, ShieldAlert } from 'lucide-react';

interface TotpSetupProps {
    onDone?: () => void;
}

export function TotpSetup({ onDone }: TotpSetupProps) {
    const { totpSetup, totpConfirm, user } = useAuth();
    const [step, setStep] = useState<'idle' | 'qr' | 'verify' | 'done'>('idle');
    const [loading, setLoading] = useState(false);
    const [secret, setSecret] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verifyCode, setVerifyCode] = useState('');
    const [copied, setCopied] = useState(false);

    const handleSetup = async () => {
        setLoading(true);
        const result = await totpSetup(user?.name || 'YuHeng User');
        if (result) {
            setSecret(result.secret);
            setQrCodeUrl(result.qrCodeUrl);
            setBackupCodes(result.backupCodes);
            setStep('qr');
        } else {
            toast.error('Failed to setup TOTP');
        }
        setLoading(false);
    };

    const handleVerify = async () => {
        if (verifyCode.length !== 6) return;
        setLoading(true);
        const success = await totpConfirm(secret, backupCodes, verifyCode);
        if (success) {
            setStep('done');
            toast.success('TOTP enabled successfully!');
        } else {
            toast.error('Invalid code, please try again');
        }
        setLoading(false);
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (step === 'idle') {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Bind an authenticator app (Google Authenticator, Ente Auth, 1Password, etc.)
                    to enable TOTP-based device authorization.
                </p>
                <Button onClick={handleSetup} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                    Setup TOTP
                </Button>
            </div>
        );
    }

    if (step === 'qr') {
        return (
            <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-3 rounded-lg">
                        <img src={qrCodeUrl} alt="TOTP QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        Scan with your authenticator app, or enter the secret manually:
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                            {secret}
                        </code>
                    </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                        <ShieldAlert className="w-4 h-4" />
                        Backup Codes - Save These!
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Use these one-time codes if you lose access to your authenticator device.
                        Each code can only be used once.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {backupCodes.map((code, i) => (
                            <code key={i} className="text-xs bg-background px-2 py-1 rounded font-mono text-center">
                                {code}
                            </code>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2" onClick={copyBackupCodes}>
                        {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copied ? 'Copied!' : 'Copy all codes'}
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label>Enter 6-digit code to verify</Label>
                    <Input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="text-center text-xl tracking-widest font-mono"
                        maxLength={6}
                        autoFocus
                    />
                </div>

                <Button onClick={handleVerify} disabled={verifyCode.length !== 6 || loading} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Verify & Enable
                </Button>
            </div>
        );
    }

    if (step === 'done') {
        return (
            <div className="space-y-4 text-center">
                <div className="text-green-500 text-lg font-bold">TOTP Enabled!</div>
                <p className="text-sm text-muted-foreground">
                    New devices can now authenticate using TOTP codes from your authenticator app.
                </p>
                {onDone && (
                    <Button onClick={onDone} className="w-full">Done</Button>
                )}
            </div>
        );
    }

    return null;
}
