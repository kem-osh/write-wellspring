import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					50: 'hsl(var(--primary-50))',
					100: 'hsl(var(--primary-100))',
					500: 'hsl(var(--primary-500))',
					600: 'hsl(var(--primary-600))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					hover: 'hsl(var(--secondary-hover))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
					hover: 'hsl(var(--muted-hover))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					50: 'hsl(var(--accent-50))',
					100: 'hsl(var(--accent-100))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				surface: {
					DEFAULT: 'hsl(var(--surface))',
					foreground: 'hsl(var(--surface-foreground))'
				},
				elevated: 'hsl(var(--elevated))',
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				'voice-button': {
					DEFAULT: 'hsl(var(--voice-button))',
					foreground: 'hsl(var(--voice-button-foreground))',
					hover: 'hsl(var(--voice-button-hover))'
				},
				'ai-button': {
					DEFAULT: 'hsl(var(--ai-button))',
					foreground: 'hsl(var(--ai-button-foreground))',
					hover: 'hsl(var(--ai-button-hover))'
				},
				'save-button': {
					DEFAULT: 'hsl(var(--save-button))',
					foreground: 'hsl(var(--save-button-foreground))',
					hover: 'hsl(var(--save-button-hover))'
				},
				'command-button': {
					DEFAULT: 'hsl(var(--command-button))',
					foreground: 'hsl(var(--command-button-foreground))',
					hover: 'hsl(var(--command-button-hover))'
				},
				status: {
					draft: 'hsl(var(--status-draft))',
					polished: 'hsl(var(--status-polished))',
					final: 'hsl(var(--status-final))'
				}
			},
			fontFamily: {
				sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
				mono: ['var(--font-mono)', 'monospace']
			},
			spacing: {
				'1': 'var(--space-1)',
				'2': 'var(--space-2)', 
				'3': 'var(--space-3)',
				'4': 'var(--space-4)',
				'5': 'var(--space-5)',
				'6': 'var(--space-6)',
				'8': 'var(--space-8)',
				'10': 'var(--space-10)',
				'12': 'var(--space-12)',
				'16': 'var(--space-16)'
			},
			boxShadow: {
				'sm': 'var(--shadow-sm)',
				'DEFAULT': 'var(--shadow)',
				'md': 'var(--shadow-md)',
				'lg': 'var(--shadow-lg)',
				'xl': 'var(--shadow-xl)',
				'pill': 'var(--pill-shadow)',
				'pill-hover': 'var(--pill-shadow-hover)'
			},
			backdropBlur: {
				'glass': 'var(--glass-blur)'
			},
			backgroundColor: {
				'glass': 'var(--glass-bg)'
			},
			borderColor: {
				'glass': 'var(--glass-border)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'pill': 'var(--nav-pill-radius)'
			},
			keyframes: {
				'fade-in': {
					"0%": { opacity: "0", transform: "translateY(10px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				'bounce-subtle': {
					"0%, 100%": { transform: "translateY(0)" },
					"50%": { transform: "translateY(-5px)" },
				},
				'pulse-slow': {
					"0%, 100%": { opacity: "0.4" },
					"50%": { opacity: "0.8" },
				},
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'slideInLeft': {
					from: {
						transform: 'translateX(-100%)',
						opacity: '0'
					},
					to: {
						transform: 'translateX(0)',
						opacity: '1'
					}
				},
				'slideOutLeft': {
					from: {
						transform: 'translateX(0)',
						opacity: '1'
					},
					to: {
						transform: 'translateX(-100%)',
						opacity: '0'
					}
				},
				'slideInRight': {
					from: {
						transform: 'translateX(100%)',
						opacity: '0'
					},
					to: {
						transform: 'translateX(0)',
						opacity: '1'
					}
				},
				'slideOutRight': {
					from: {
						transform: 'translateX(0)',
						opacity: '1'
					},
					to: {
						transform: 'translateX(100%)',
						opacity: '0'
					}
				}
			},
			animation: {
				'fade-in': 'fade-in 0.5s ease-out',
				'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
				'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'slideInLeft': 'slideInLeft 0.3s ease-out',
				'slideOutLeft': 'slideOutLeft 0.3s ease-out',
				'slideInRight': 'slideInRight 0.3s ease-out',
				'slideOutRight': 'slideOutRight 0.3s ease-out',
				'slide-in-up': 'slideInUp 0.3s ease-out',
				'slide-out-down': 'slideOutDown 0.3s ease-out',
				'message-enter': 'messageEnter 0.2s ease-out',
				'caret-blink': 'caretBlink 1s infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;