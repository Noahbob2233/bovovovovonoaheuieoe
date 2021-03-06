import { Component, Output, EventEmitter, ViewContainerRef, ChangeDetectionStrategy, Input, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FormatGuideDialogComponent } from './format-guide-dialog.component';
import { ImageDialogComponent } from './image-dialog.component';
import { RpVoice } from '../models/rp-voice';
import { RpChara } from '../models/rp-chara';

@Component({
  selector: 'rpn-send-box',
  template: `
    <div id="send-box" [class]="elementClass" [style.background-color]="chara?.color" [style.color]="chara?.color|bw">

      <div id="voice-bar">

        <div id="click-to-change" matTooltip="Change character" matTooltipPosition="above" (click)="openCharaSelector()">
          <ng-container *ngIf="isNarrator">
            Narrator
          </ng-container>

          <ng-container *ngIf="isOOC">
            Out of character
          </ng-container>

          <ng-container *ngIf="isChara">
            {{ chara.name }}
          </ng-container>
        </div>

        <button mat-icon-button (click)="openCharaSelector()">
          <mat-icon aria-label="Change character" matTooltip="Change character" matTooltipPosition="above">people</mat-icon>
        </button>

        <button mat-icon-button (click)="showImageDialog()">
          <mat-icon aria-label="Post image" matTooltip="Post image" matTooltipPosition="above">image</mat-icon>
        </button>

        <button mat-icon-button (click)="showFormatGuideDialog()">
          <mat-icon aria-label="Open post format guide" matTooltip="Formatting info" matTooltipPosition="above">text_fields</mat-icon>
        </button>

      </div>

      <div id="typing-area">

        <textarea #textarea
          matTextareaAutosize
          matAutosizeMinRows="3"
          [(ngModel)]="content"
          (ngModelChange)="contentChange.emit($event)"
          placeholder="Type your message."
          maxlength="10000"
          [disabled]="isSending"
          (keypress)="keypressCheckEnter($event)"
        ></textarea>

        <ng-container *ngIf="!isSending">
          <button mat-icon-button [disabled]="!valid()" (click)="onSendMessage()">
            <mat-icon aria-label="Send" matTooltip="Send" matTooltipPosition="above">send</mat-icon>
          </button>
        </ng-container>

        <ng-container *ngIf="isSending">
          <div id="send-loader-container">
            <mat-spinner [diameter]="24"></mat-spinner>
          </div>
        </ng-container>

      </div>

    </div>
  `,
  styleUrls: ['./send-box.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SendBoxComponent implements OnChanges {

  @Input() voice: RpVoice;
  @Input() content = '';
  @Input() pressEnterToSend: boolean;
  @Input() isSending: boolean;
  @Output() readonly contentChange: EventEmitter<string> = new EventEmitter();
  @Output() readonly sendMessage: EventEmitter<[string, RpVoice]> = new EventEmitter();
  @Output() readonly sendImage: EventEmitter<string> = new EventEmitter();
  @Output() readonly changeChara: EventEmitter<void> = new EventEmitter();
  @ViewChild('textarea') textarea: ElementRef<HTMLTextAreaElement>;

  constructor(
    private dialog: MatDialog,
    private viewContainerRef: ViewContainerRef,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.isSending && this.isSending === false && changes.isSending.previousValue === true) {
      setTimeout(() => this.textarea.nativeElement.focus(), 1);
    }
  }

  get isNarrator() {
    return this.voice === 'narrator';
  }

  get isOOC() {
    return this.voice === 'ooc';
  }

  get isChara() {
    return this.voice && !(typeof this.voice === 'string');
  }

  get chara() {
    return this.isChara ? (this.voice as RpChara) : null;
  }

  get elementClass() {
    return this.isChara ? 'send-box-chara' : 'send-box-' + this.voice;
  }

  valid() {
    return this.content.trim().length > 0;
  }

  onSendMessage() {
    if (!this.valid()) return;

    let voice = this.voice;
    let content = this.content;

    // shortcut to send ooc messages; if not on the actual OOC character,
    //  you can send a message inside of (()) et all, as a shortcut to change
    //  that specific message to an OOC message
    if (voice !== 'ooc') {
      [
        /^\({2,}\s*(.*?[^\s])\s*\)*$/g, // (( message text ))
        /^\{+\s*(.*?[^\s])\s*\}*$/g, // { message text }, {{ message text }}, ...
        /^\/\/\s*(.*[^\s])\s*$/g // //message text
      ].find(regex => {
        const match = regex.exec(content);
        if (match) {
          voice = 'ooc';
          content = match[1];
        }
        return !!match;
      });
    }

    if (!content.trim()) return;

    this.sendMessage.emit([content, voice]);
  }

  openCharaSelector() {
    this.changeChara.emit();
  }

  showImageDialog() {
    const dialogRef = this.dialog.open(ImageDialogComponent, { viewContainerRef: this.viewContainerRef });
    dialogRef.beforeClose().subscribe(url => {
      if (url) this.sendImage.emit(url);
    });
  }

  keypressCheckEnter($event: KeyboardEvent) {
    const keyCode = $event.keyCode || $event.which;
    if (keyCode !== 13) return;

    if ($event.shiftKey) return;

    if (this.pressEnterToSend || $event.ctrlKey) {
      if (!this.isSending) this.onSendMessage();
      return false;
    }
  }

  showFormatGuideDialog() {
    this.dialog.open(FormatGuideDialogComponent);
  }
}
