'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

export default function OptionsClient() {
	const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
	const router = useRouter()
	const [tankColor, setTankColor] = useState('#ff0000')
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		async function fetchSettings() {
			try {
				const res = await fetch('/api/me')
				if (res.ok) {
					const data = await res.json()
					setTankColor(data.user.tankColor || '#ff0000')
				} else if (res.status === 401) {
					router.push('/signin')
				}
			} catch (error) {
				console.error("Error loading settings:", error)
			} finally {
				setLoading(false)
			}
		}
		fetchSettings()
	}, [router])

	const showNotif = (msg: string, type: 'success' | 'error') => {
		setNotification({ msg, type })
		setTimeout(() => setNotification(null), 3000)
	}

	const handleSave = async () => {
		setSaving(true)
		try {
			const res = await fetch('/api/me', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tankColor: tankColor
				})
			})

			if (res.ok) {
				showNotif("Settings saved successfully!", "success")
			} else {
				const data = await res.json()
				showNotif(data.error || "Failed to save settings", "error")
			}
		} catch (error) {
			console.error("Error saving:", error)
			showNotif("Network error. Please try again.", "error")
		} finally {
			setSaving(false)
		}
	}

		const handleExport = () => {
		window.open('/api/me/gdpr/export', '_blank');
	}

	const handleDelete = async () => {
		if (!confirm('CAUTION: This will permanently delete your account and all associated data. Are you absolutely sure?')) return;
		
		setSaving(true);
		try {
			const res = await fetch('/api/me/gdpr/delete', { method: 'DELETE' });
			if (res.ok) {
				signOut({ callbackUrl: '/signin' });
			} else {
				const data = await res.json();
				showNotif(data.error || "Failed to delete account", "error");
			}
		} catch (error) {
			console.error("Delete error:", error);
			showNotif("Network error", "error");
		} finally {
			setSaving(false);
		}
	}

	if (loading) return <div className="game-container"><div className="loading-text">LOADING...</div></div>

	return (
		<div className="game-container">
			<Link href="/home" className="back-button">
				← BACK
			</Link>
			<div className="dashboard-container">
				<header className="dashboard-header">
					<h1 className="dashboard-title">
						<span className="title-top">HELP &</span>
						<span className="title-main">OPTIONS</span>
					</h1>
				</header>
				<div className="dashboard-content">
					<div className="profile-card" style={{ marginBottom: '20px' }}>
						<div className="profile-info">
							<h3 style={{ color: '#fff', marginBottom: '15px' }}>🎮 CONTROLS</h3>
							<div className="info-row">
								<span className="info-label">MOVE</span>
								<span className="info-value">W, A, S, D</span>
							</div>
							<div className="info-row">
								<span className="info-label">SHOOT</span>
								<span className="info-value">SPACE</span>
							</div>
							<div className="info-row">
								<span className="info-label">RELOAD</span>
								<span className="info-value">R</span>
							</div>
						</div>
					</div>
					<div className="profile-card">
						<div className="profile-info">
							<h3 style={{ color: '#fff', marginBottom: '15px' }}>⚙️ SETTINGS</h3>
							<div className="info-row">
								<span className="info-label">TANK COLOR</span>
								<input
									type="color"
									value={tankColor}
									onChange={(e) => setTankColor(e.target.value)}
									style={{ width: '50px', height: '30px', cursor: 'pointer' }}
								/>
								<span className="info-value level-badge">{tankColor}</span>
								<button
									onClick={() => setTankColor('#00ff00')}
									className="menu-button"
									style={{ padding: '5px 15px', cursor: 'pointer' }}
								>
									<span className="menu-text">DEFAULT</span>
								</button>
							</div>
						</div>
					</div>
					<div className="profile-card" style={{ marginTop: '20px' }}>
						<div className="profile-info">
							<h3 style={{ color: '#fff', marginBottom: '15px' }}>🔒 PRIVACY (GDPR)</h3>
							<div className="info-row">
								<span className="info-label">MY DATA</span>
								<button
									onClick={handleExport}
									className="menu-button"
									style={{ padding: '5px 15px', cursor: 'pointer', backgroundColor: '#333' }}
								>
									<span className="menu-text">DOWNLOAD</span>
								</button>
							</div>
							<div className="info-row">
								<span className="info-label" style={{ color: '#ff4444' }}>DANGER ZONE</span>
								<button
									onClick={handleDelete}
									className="menu-button"
									style={{ padding: '5px 15px', cursor: 'pointer', backgroundColor: '#4a0000', borderColor: '#ff0000' }}
								>
									<span className="menu-text" style={{ color: '#ff4444' }}>DELETE ACCOUNT</span>
								</button>
							</div>
						</div>
					</div>
					<button
						onClick={handleSave}
						className="menu-button"
						style={{ marginTop: '20px', cursor: 'pointer' }}
						disabled={saving}
					>
						<span className="menu-text">{saving ? 'SAVING...' : 'SAVE CHANGES'}</span>
					</button>
				</div>
			</div>
			{notification && (
				<div className={`toast-notification ${notification.type}`}>
					{notification.msg}
				</div>
			)}
		</div>
	)
}