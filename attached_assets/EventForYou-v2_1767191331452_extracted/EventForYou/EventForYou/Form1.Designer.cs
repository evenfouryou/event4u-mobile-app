using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace EventForYou
{
    partial class Form1
    {
        //[DllImport("libsSIAE.dll",CallingConvention = CallingConvention.StdCall)]
        //public static extern int VerifyPIN(string pin);
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        //private void btnVerify_Click()
        //{
            //string pin ="1234";
            //int result = VerifyPIN(pin);
            //if (result != 0)
            //{
            //    MessageBox.Show($"Verify pin {result}");
            //    //TODO add alert form
            //}
            //else
            //{
            //    MessageBox.Show($"Error Verify pin {result}");
            //    //alert error
            //}
        //}
        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.verifyPinBtn = new System.Windows.Forms.Button();
            this.pinCode = new System.Windows.Forms.TextBox();
            this.label1 = new System.Windows.Forms.Label();
            this.pinValue = new System.Windows.Forms.TextBox();
            this.label2 = new System.Windows.Forms.Label();
            this.txtCounter = new System.Windows.Forms.Label();
            this.serialTxt = new System.Windows.Forms.Label();
            this.monthBtn = new System.Windows.Forms.Button();
            this.connect = new System.Windows.Forms.Button();
            this.result = new System.Windows.Forms.Label();
            this.button5 = new System.Windows.Forms.Button();
            this.button6 = new System.Windows.Forms.Button();
            this.dayBtn = new System.Windows.Forms.Button();
            this.certificateTxt = new System.Windows.Forms.Label();
            this.richTextBox1 = new System.Windows.Forms.RichTextBox();
            this.SuspendLayout();
            // 
            // verifyPinBtn
            // 
            this.verifyPinBtn.Location = new System.Drawing.Point(405, 102);
            this.verifyPinBtn.Name = "verifyPinBtn";
            this.verifyPinBtn.Size = new System.Drawing.Size(171, 37);
            this.verifyPinBtn.TabIndex = 0;
            this.verifyPinBtn.Text = "Verify Pin";
            this.verifyPinBtn.UseVisualStyleBackColor = true;
            this.verifyPinBtn.Click += new System.EventHandler(this.verifyPinBtnClick);
            // 
            // pinCode
            // 
            this.pinCode.Location = new System.Drawing.Point(15, 109);
            this.pinCode.Name = "pinCode";
            this.pinCode.Size = new System.Drawing.Size(152, 22);
            this.pinCode.TabIndex = 1;
            this.pinCode.Text = "1";
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(15, 90);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(33, 16);
            this.label1.TabIndex = 2;
            this.label1.Text = "nPin";
            // 
            // pinValue
            // 
            this.pinValue.Location = new System.Drawing.Point(202, 112);
            this.pinValue.Name = "pinValue";
            this.pinValue.Size = new System.Drawing.Size(171, 22);
            this.pinValue.TabIndex = 3;
            this.pinValue.Text = "75399990";
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(204, 91);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(26, 16);
            this.label2.TabIndex = 4;
            this.label2.Text = "Pin";
            // 
            // txtCounter
            // 
            this.txtCounter.AutoSize = true;
            this.txtCounter.Location = new System.Drawing.Point(12, 6);
            this.txtCounter.Name = "txtCounter";
            this.txtCounter.Size = new System.Drawing.Size(74, 16);
            this.txtCounter.TabIndex = 8;
            this.txtCounter.Text = "Txt Counter";
            // 
            // serialTxt
            // 
            this.serialTxt.AutoSize = true;
            this.serialTxt.Location = new System.Drawing.Point(12, 32);
            this.serialTxt.Name = "serialTxt";
            this.serialTxt.Size = new System.Drawing.Size(126, 16);
            this.serialTxt.TabIndex = 9;
            this.serialTxt.Text = "Serial Number Hex: ";
            // 
            // monthBtn
            // 
            this.monthBtn.Location = new System.Drawing.Point(202, 159);
            this.monthBtn.Name = "monthBtn";
            this.monthBtn.Size = new System.Drawing.Size(171, 37);
            this.monthBtn.TabIndex = 10;
            this.monthBtn.Text = "Month";
            this.monthBtn.UseVisualStyleBackColor = true;
            this.monthBtn.Click += new System.EventHandler(this.monthBtnClick);
            // 
            // connect
            // 
            this.connect.Location = new System.Drawing.Point(599, 159);
            this.connect.Name = "connect";
            this.connect.Size = new System.Drawing.Size(143, 41);
            this.connect.TabIndex = 16;
            this.connect.Text = "Connect to Api";
            this.connect.UseVisualStyleBackColor = true;
            this.connect.Click += new System.EventHandler(this.connect_Click);
            // 
            // result
            // 
            this.result.Location = new System.Drawing.Point(15, 210);
            this.result.Name = "result";
            this.result.Size = new System.Drawing.Size(132, 24);
            this.result.TabIndex = 17;
            this.result.Text = "Result";
            // 
            // button5
            // 
            this.button5.Location = new System.Drawing.Point(599, 102);
            this.button5.Name = "button5";
            this.button5.Size = new System.Drawing.Size(143, 42);
            this.button5.TabIndex = 18;
            this.button5.Text = "Start App";
            this.button5.UseVisualStyleBackColor = true;
            this.button5.Click += new System.EventHandler(this.startAppBtn);
            // 
            // button6
            // 
            this.button6.Location = new System.Drawing.Point(12, 161);
            this.button6.Name = "button6";
            this.button6.Size = new System.Drawing.Size(171, 42);
            this.button6.TabIndex = 19;
            this.button6.Text = "Read counter";
            this.button6.UseVisualStyleBackColor = true;
            this.button6.Click += new System.EventHandler(this.readCounterBtnClick);
            // 
            // dayBtn
            // 
            this.dayBtn.Location = new System.Drawing.Point(405, 161);
            this.dayBtn.Name = "dayBtn";
            this.dayBtn.Size = new System.Drawing.Size(171, 37);
            this.dayBtn.TabIndex = 20;
            this.dayBtn.Text = "Day";
            this.dayBtn.UseVisualStyleBackColor = true;
            this.dayBtn.Click += new System.EventHandler(this.dayBtnClick);
            // 
            // certificateTxt
            // 
            this.certificateTxt.AutoSize = true;
            this.certificateTxt.Location = new System.Drawing.Point(15, 57);
            this.certificateTxt.Name = "certificateTxt";
            this.certificateTxt.Size = new System.Drawing.Size(75, 16);
            this.certificateTxt.TabIndex = 21;
            this.certificateTxt.Text = "Certificate : ";
            // 
            // richTextBox1
            // 
            this.richTextBox1.Location = new System.Drawing.Point(18, 237);
            this.richTextBox1.Name = "richTextBox1";
            this.richTextBox1.Size = new System.Drawing.Size(922, 290);
            this.richTextBox1.TabIndex = 22;
            this.richTextBox1.Text = "";
            // 
            // Form1
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(8F, 16F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(976, 683);
            this.Controls.Add(this.richTextBox1);
            this.Controls.Add(this.certificateTxt);
            this.Controls.Add(this.dayBtn);
            this.Controls.Add(this.button6);
            this.Controls.Add(this.button5);
            this.Controls.Add(this.connect);
            this.Controls.Add(this.result);
            this.Controls.Add(this.monthBtn);
            this.Controls.Add(this.serialTxt);
            this.Controls.Add(this.txtCounter);
            this.Controls.Add(this.label2);
            this.Controls.Add(this.pinValue);
            this.Controls.Add(this.label1);
            this.Controls.Add(this.pinCode);
            this.Controls.Add(this.verifyPinBtn);
            this.Name = "Form1";
            this.Text = "Event for you";
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private Button verifyPinBtn;
        private TextBox pinCode;
        private Label label1;
        private TextBox pinValue;
        private Label label2;
        private Label txtCounter;
        private Label serialTxt;
        private Button monthBtn;
        private Button connect;
        private Label result;
        private Button button5;
        private Button button6;
        private Button dayBtn;
        private Label certificateTxt;
        private RichTextBox richTextBox1;
    }
}

