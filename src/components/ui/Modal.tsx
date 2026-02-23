import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string
    showCloseButton?: boolean
    closeOnOverlayClick?: boolean
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
}

const Modal = ({
    isOpen,
    onClose,
    children,
    className,
    showCloseButton = true,
    closeOnOverlayClick = true,
    size = 'md'
}: ModalProps) => {
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        full: 'max-w-[95vw]'
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={closeOnOverlayClick ? onClose : undefined}
            />
            <div
                className={cn(
                    "relative w-full bg-[hsl(var(--card))] rounded-xl shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-200",
                    sizeClasses[size],
                    className
                )}
            >
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
                {children}
            </div>
        </div>
    )
}

const ModalHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("px-6 py-4 border-b border-[hsl(var(--border))] shrink-0", className)}>
        {children}
    </div>
)

const ModalTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <h3 className={cn("text-lg font-semibold text-[hsl(var(--foreground))]", className)}>
        {children}
    </h3>
)

const ModalDescription = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <p className={cn("text-sm text-[hsl(var(--muted-foreground))]", className)}>
        {children}
    </p>
)

const ModalBody = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("px-6 py-4 flex-1 overflow-y-auto", className)}>
        {children}
    </div>
)

const ModalFooter = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] shrink-0 flex items-center justify-end gap-3", className)}>
        {children}
    </div>
)

export { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter }
