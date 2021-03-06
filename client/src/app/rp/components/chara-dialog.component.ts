import { Component, Inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  template: `
    <div id="dialog-header">

      <h3 mat-dialog-title>{{ isEditing ? 'Editing Character' : 'New Character' }}</h3>

      <button mat-icon-button mat-dialog-title mat-dialog-close>
        <mat-icon aria-label="Close dialog" matTooltip="Close">close</mat-icon>
      </button>

    </div>

    <mat-form-field>
      <input matInput maxlength="30" placeholder="Name this character:" [(ngModel)]="name" cdkFocusInitial>
    </mat-form-field>

    <span [(colorPicker)]="color" [cpToggle]="true" cpDialogDisplay="inline" [cpDisableInput]="false" cpWidth="200"></span>

    <mat-dialog-actions>
      <button mat-raised-button [disabled]="!valid" [style.background-color]="submitButtonColor" [style.color]="submitButtonColor|bw" (click)="submit()">OK</button>
      <button mat-raised-button mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [`
    #dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media (max-height:480px) {
      #dialog-header {
        display: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CharaDialogComponent implements OnInit {

  isEditing: boolean;
  name = '';
  color = '#80c9ff';

  constructor(
    private dialogRef: MatDialogRef<CharaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { edit: boolean, name: string, color: string },
  ) { }

  ngOnInit() {
    this.isEditing = this.data.edit;
    if (this.data.name) this.name = this.data.name;
    if (this.data.color) this.color = this.data.color;
  }

  get valid() {
    return this.name.trim() && this.color;
  }

  get submitButtonColor() {
    return this.valid ? this.color : null;
  }

  submit() {
    if (!this.valid) return;

    this.dialogRef.close({name: this.name, color: this.color});
  }

}
